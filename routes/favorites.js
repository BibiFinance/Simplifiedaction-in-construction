const express = require('express');
const Favorite = require('../models/Favorite');
const { authenticateToken, checkFavoritesLimit } = require('../middleware/auth');
const { validateStockSymbol, sanitizeString } = require('../utils/validation');

const router = express.Router();

// Toutes les routes favoris nécessitent une authentification
router.use(authenticateToken);

/**
 * GET /api/favorites
 * Récupération de tous les favoris de l'utilisateur
 */
router.get('/', async (req, res) => {
    try {
        const favorites = await Favorite.getByUserId(req.user.id);

        res.json({
            success: true,
            data: favorites,
            count: favorites.length
        });
    } catch (error) {
        console.error('Erreur récupération favoris:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * POST /api/favorites
 * Ajout d'une action aux favoris
 */
router.post('/', checkFavoritesLimit, async (req, res) => {
    try {
        const { symbol, company_name } = req.body;

        // Nettoyer et valider les données
        const cleanSymbol = sanitizeString(symbol).toUpperCase();
        const cleanCompanyName = sanitizeString(company_name);

        // Valider le symbole
        const symbolValidation = validateStockSymbol(cleanSymbol);
        if (!symbolValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: symbolValidation.errors.join(', ')
            });
        }

        // Valider le nom de l'entreprise
        if (!cleanCompanyName || cleanCompanyName.length < 1) {
            return res.status(400).json({
                success: false,
                error: 'Le nom de l\'entreprise est requis'
            });
        }

        if (cleanCompanyName.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Le nom de l\'entreprise ne peut pas dépasser 255 caractères'
            });
        }

        // Vérifier si l'action n'est pas déjà en favoris
        const isAlreadyFavorite = await Favorite.isFavorite(req.user.id, cleanSymbol);
        if (isAlreadyFavorite) {
            return res.status(409).json({
                success: false,
                error: 'Cette action est déjà dans vos favoris'
            });
        }

        // Ajouter aux favoris
        const newFavorite = await Favorite.add(req.user.id, cleanSymbol, cleanCompanyName);

        res.status(201).json({
            success: true,
            message: 'Action ajoutée aux favoris avec succès',
            data: newFavorite,
            favorites_info: req.favoritesInfo
        });
    } catch (error) {
        console.error('Erreur ajout favori:', error);
        
        // Gestion des erreurs de contrainte unique
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'Cette action est déjà dans vos favoris'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * DELETE /api/favorites/:symbol
 * Suppression d'une action des favoris
 */
router.delete('/:symbol', async (req, res) => {
    try {
        const symbol = sanitizeString(req.params.symbol).toUpperCase();

        // Valider le symbole
        const symbolValidation = validateStockSymbol(symbol);
        if (!symbolValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: symbolValidation.errors.join(', ')
            });
        }

        // Supprimer des favoris
        const removed = await Favorite.remove(req.user.id, symbol);

        if (!removed) {
            return res.status(404).json({
                success: false,
                error: 'Action non trouvée dans vos favoris'
            });
        }

        res.json({
            success: true,
            message: 'Action supprimée des favoris avec succès'
        });
    } catch (error) {
        console.error('Erreur suppression favori:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/favorites/:symbol/check
 * Vérification si une action est en favoris
 */
router.get('/:symbol/check', async (req, res) => {
    try {
        const symbol = sanitizeString(req.params.symbol).toUpperCase();

        // Valider le symbole
        const symbolValidation = validateStockSymbol(symbol);
        if (!symbolValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: symbolValidation.errors.join(', ')
            });
        }

        const isFavorite = await Favorite.isFavorite(req.user.id, symbol);

        res.json({
            success: true,
            data: {
                symbol: symbol,
                is_favorite: isFavorite
            }
        });
    } catch (error) {
        console.error('Erreur vérification favori:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/favorites/search
 * Recherche dans les favoris de l'utilisateur
 */
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 1) {
            return res.status(400).json({
                success: false,
                error: 'Terme de recherche requis'
            });
        }

        const searchTerm = sanitizeString(q);
        const favorites = await Favorite.search(req.user.id, searchTerm);

        res.json({
            success: true,
            data: favorites,
            count: favorites.length,
            search_term: searchTerm
        });
    } catch (error) {
        console.error('Erreur recherche favoris:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * DELETE /api/favorites
 * Suppression de tous les favoris de l'utilisateur
 */
router.delete('/', async (req, res) => {
    try {
        const removedCount = await Favorite.removeAllByUserId(req.user.id);

        res.json({
            success: true,
            message: `${removedCount} favoris supprimés avec succès`,
            removed_count: removedCount
        });
    } catch (error) {
        console.error('Erreur suppression tous favoris:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/favorites/stats
 * Statistiques des favoris de l'utilisateur
 */
router.get('/stats', async (req, res) => {
    try {
        const count = await Favorite.countByUserId(req.user.id);
        const favorites = await Favorite.getByUserId(req.user.id);
        
        // Calculer des statistiques supplémentaires
        const oldestFavorite = favorites.length > 0 ? favorites[favorites.length - 1] : null;
        const newestFavorite = favorites.length > 0 ? favorites[0] : null;

        const stats = {
            total_count: count,
            limit: req.user.is_premium ? null : 5,
            remaining: req.user.is_premium ? null : Math.max(0, 5 - count),
            oldest_favorite: oldestFavorite,
            newest_favorite: newestFavorite,
            is_premium: req.user.is_premium
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Erreur statistiques favoris:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

module.exports = router;
