const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { validateName, sanitizeString } = require('../utils/validation');

const router = express.Router();

// Toutes les routes utilisateur nécessitent une authentification
router.use(authenticateToken);

/**
 * GET /api/user/profile
 * Récupération du profil utilisateur
 */
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                is_premium: user.is_premium,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });
    } catch (error) {
        console.error('Erreur récupération profil:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * PUT /api/user/profile
 * Mise à jour du profil utilisateur
 */
router.put('/profile', async (req, res) => {
    try {
        const { firstName, lastName } = req.body;

        // Nettoyer les données
        const updateData = {
            firstName: sanitizeString(firstName),
            lastName: sanitizeString(lastName)
        };

        // Valider le prénom
        const firstNameValidation = validateName(updateData.firstName, 'prénom');
        if (!firstNameValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: firstNameValidation.errors.join(', ')
            });
        }

        // Valider le nom
        const lastNameValidation = validateName(updateData.lastName, 'nom');
        if (!lastNameValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: lastNameValidation.errors.join(', ')
            });
        }

        // Mettre à jour le profil
        const updatedUser = await User.updateProfile(req.user.id, updateData);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Profil mis à jour avec succès',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                is_premium: updatedUser.is_premium,
                created_at: updatedUser.created_at,
                updated_at: updatedUser.updated_at
            }
        });
    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/user/stats
 * Récupération des statistiques utilisateur
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await User.getStats(req.user.id);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * POST /api/user/upgrade-premium
 * Simulation de l'upgrade Premium (pour démonstration)
 */
router.post('/upgrade-premium', async (req, res) => {
    try {
        // Dans un vrai système, ici on vérifierait le paiement avec Stripe
        // Pour la démonstration, on active directement Premium
        
        const updatedUser = await User.updatePremiumStatus(req.user.id, true);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Félicitations ! Vous êtes maintenant Premium !',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                is_premium: updatedUser.is_premium,
                created_at: updatedUser.created_at,
                updated_at: updatedUser.updated_at
            }
        });
    } catch (error) {
        console.error('Erreur upgrade Premium:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * POST /api/user/downgrade-premium
 * Simulation du downgrade Premium
 */
router.post('/downgrade-premium', async (req, res) => {
    try {
        const updatedUser = await User.updatePremiumStatus(req.user.id, false);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Votre compte a été rétrogradé vers le plan gratuit',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                is_premium: updatedUser.is_premium,
                created_at: updatedUser.created_at,
                updated_at: updatedUser.updated_at
            }
        });
    } catch (error) {
        console.error('Erreur downgrade Premium:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * DELETE /api/user/account
 * Suppression du compte utilisateur
 */
router.delete('/account', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Mot de passe requis pour supprimer le compte'
            });
        }

        // Vérifier le mot de passe
        const user = await User.findById(req.user.id);
        const isPasswordValid = await User.verifyPassword(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Mot de passe incorrect'
            });
        }

        // Supprimer le compte
        const deleted = await User.delete(req.user.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        // Supprimer le cookie de token
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({
            success: true,
            message: 'Compte supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur suppression compte:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

module.exports = router;
