const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET doit être défini dans les variables d\'environnement');
}

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} user - Objet utilisateur
 * @returns {string} Token JWT
 */
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        isPremium: user.is_premium || false
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'simplified-action',
        subject: user.id.toString()
    });
}

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Token JWT à vérifier
 * @returns {Object} Payload décodé
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expiré');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Token invalide');
        } else {
            throw new Error('Erreur de vérification du token');
        }
    }
}

/**
 * Décode un token sans le vérifier (pour debug)
 * @param {string} token - Token JWT
 * @returns {Object} Payload décodé
 */
function decodeToken(token) {
    return jwt.decode(token);
}

/**
 * Vérifie si un token est expiré
 * @param {string} token - Token JWT
 * @returns {boolean} True si expiré
 */
function isTokenExpired(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return true;
        
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        return true;
    }
}

/**
 * Extrait le token du header Authorization ou des cookies
 * @param {Object} req - Objet request Express
 * @returns {string|null} Token ou null
 */
function extractToken(req) {
    // Vérifier d'abord les cookies
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }

    // Vérifier le header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

module.exports = {
    generateToken,
    verifyToken,
    decodeToken,
    isTokenExpired,
    extractToken
};
