const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { validateRegistrationData, validateLoginData, sanitizeString } = require('../utils/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Limitation du taux de requêtes pour les routes d'authentification
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 tentatives par IP
    message: {
        success: false,
        error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limitation plus stricte pour l'inscription
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // Maximum 3 inscriptions par IP par heure
    message: {
        success: false,
        error: 'Trop de tentatives d\'inscription. Réessayez dans 1 heure.'
    }
});

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { email, password, confirmPassword, firstName, lastName } = req.body;

        // Nettoyer et valider les données
        const userData = {
            email: sanitizeString(email),
            password,
            confirmPassword,
            firstName: sanitizeString(firstName),
            lastName: sanitizeString(lastName)
        };

        // Validation des données
        const validation = validateRegistrationData(userData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: validation.errors.join(', ')
            });
        }

        // Vérifier si l'email existe déjà
        const emailExists = await User.emailExists(userData.email);
        if (emailExists) {
            return res.status(409).json({
                success: false,
                error: 'Cette adresse email est déjà utilisée'
            });
        }

        // Créer l'utilisateur
        const newUser = await User.create(userData);

        // Générer un token JWT
        const token = generateToken(newUser);

        // Définir le cookie avec le token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
        });

        res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    firstName: newUser.first_name,
                    lastName: newUser.last_name,
                    isPremium: newUser.is_premium
                }
            }
        });

    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Nettoyer et valider les données
        const loginData = {
            email: sanitizeString(email),
            password
        };

        // Validation des données
        const validation = validateLoginData(loginData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: validation.errors.join(', ')
            });
        }

        // Trouver l'utilisateur
        const user = await User.findByEmail(loginData.email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await User.verifyPassword(loginData.password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Email ou mot de passe incorrect'
            });
        }

        // Générer un token JWT
        const token = generateToken(user);

        // Définir le cookie avec le token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
        });

        res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    isPremium: user.is_premium
                }
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * POST /api/auth/logout
 * Déconnexion d'un utilisateur
 */
router.post('/logout', (req, res) => {
    // Supprimer le cookie de token
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.json({
        success: true,
        message: 'Déconnexion réussie'
    });
});

/**
 * GET /api/auth/verify
 * Vérification du token et récupération des informations utilisateur
 */
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    firstName: req.user.first_name,
                    lastName: req.user.last_name,
                    isPremium: req.user.is_premium,
                    createdAt: req.user.created_at
                }
            }
        });
    } catch (error) {
        console.error('Erreur vérification token:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/auth/status
 * Vérification du statut d'authentification (sans middleware obligatoire)
 */
router.get('/status', async (req, res) => {
    try {
        const { extractToken, verifyToken } = require('../utils/jwt');
        
        const token = extractToken(req);
        if (!token) {
            return res.json({
                success: true,
                authenticated: false
            });
        }

        try {
            const decoded = verifyToken(token);
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                return res.json({
                    success: true,
                    authenticated: false
                });
            }

            res.json({
                success: true,
                authenticated: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        isPremium: user.is_premium
                    }
                }
            });
        } catch (tokenError) {
            res.json({
                success: true,
                authenticated: false
            });
        }
    } catch (error) {
        console.error('Erreur vérification statut:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

module.exports = router;
