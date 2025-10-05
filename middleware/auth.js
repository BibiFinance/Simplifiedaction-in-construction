const { verifyToken, extractToken } = require('../utils/jwt');
const { query } = require('../config/database');

/**
 * Middleware d'authentification
 * Vérifie la validité du token JWT et charge les informations utilisateur
 */
async function authenticateToken(req, res, next) {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token d\'authentification requis'
            });
        }

        // Vérifier le token
        const decoded = verifyToken(token);

        // Charger les informations utilisateur depuis la base de données
        const userResult = await query(
            'SELECT id, email, first_name, last_name, is_premium, created_at FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        // Ajouter les informations utilisateur à la requête
        req.user = userResult.rows[0];
        req.token = token;

        next();
    } catch (error) {
        console.error('Erreur authentification:', error);
        
        let errorMessage = 'Token invalide';
        if (error.message === 'Token expiré') {
            errorMessage = 'Session expirée, veuillez vous reconnecter';
        }

        return res.status(401).json({
            success: false,
            error: errorMessage
        });
    }
}

/**
 * Middleware d'authentification optionnelle
 * Charge les informations utilisateur si un token valide est présent
 */
async function optionalAuth(req, res, next) {
    try {
        const token = extractToken(req);

        if (token) {
            const decoded = verifyToken(token);
            
            const userResult = await query(
                'SELECT id, email, first_name, last_name, is_premium, created_at FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length > 0) {
                req.user = userResult.rows[0];
                req.token = token;
            }
        }

        next();
    } catch (error) {
        // En cas d'erreur, on continue sans utilisateur authentifié
        console.log('Token invalide ou expiré (authentification optionnelle)');
        next();
    }
}

/**
 * Middleware pour vérifier le statut Premium
 */
function requirePremium(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentification requise'
        });
    }

    if (!req.user.is_premium) {
        return res.status(403).json({
            success: false,
            error: 'Abonnement Premium requis',
            premium_required: true
        });
    }

    next();
}

/**
 * Middleware pour vérifier les limites des comptes gratuits
 */
async function checkFavoritesLimit(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentification requise'
            });
        }

        // Les utilisateurs Premium n'ont pas de limite
        if (req.user.is_premium) {
            return next();
        }

        // Vérifier le nombre de favoris pour les utilisateurs gratuits
        const favoritesResult = await query(
            'SELECT COUNT(*) as count FROM favorites WHERE user_id = $1',
            [req.user.id]
        );

        const favoritesCount = parseInt(favoritesResult.rows[0].count);
        const limit = 5; // Limite pour les comptes gratuits

        if (favoritesCount >= limit) {
            return res.status(403).json({
                success: false,
                error: `Limite de ${limit} favoris atteinte pour les comptes gratuits`,
                premium_required: true,
                current_count: favoritesCount,
                limit: limit
            });
        }

        // Ajouter les informations de limite à la requête
        req.favoritesInfo = {
            current_count: favoritesCount,
            limit: limit,
            remaining: limit - favoritesCount
        };

        next();
    } catch (error) {
        console.error('Erreur vérification limite favoris:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requirePremium,
    checkFavoritesLimit
};
