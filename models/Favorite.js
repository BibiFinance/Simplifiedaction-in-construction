const { query } = require('../config/database');

class Favorite {
    /**
     * Ajoute une action aux favoris d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @param {string} symbol - Symbole de l'action
     * @param {string} companyName - Nom de l'entreprise
     * @returns {Object} Favori créé
     */
    static async add(userId, symbol, companyName) {
        const result = await query(
            `INSERT INTO favorites (user_id, symbol, company_name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, symbol, company_name, added_at`,
            [userId, symbol.toUpperCase(), companyName]
        );

        return result.rows[0];
    }

    /**
     * Supprime une action des favoris d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @param {string} symbol - Symbole de l'action
     * @returns {boolean} True si la suppression a réussi
     */
    static async remove(userId, symbol) {
        const result = await query(
            'DELETE FROM favorites WHERE user_id = $1 AND symbol = $2',
            [userId, symbol.toUpperCase()]
        );

        return result.rowCount > 0;
    }

    /**
     * Obtient tous les favoris d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @returns {Array} Liste des favoris
     */
    static async getByUserId(userId) {
        const result = await query(
            `SELECT id, symbol, company_name, added_at
             FROM favorites
             WHERE user_id = $1
             ORDER BY added_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Vérifie si une action est dans les favoris d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @param {string} symbol - Symbole de l'action
     * @returns {boolean} True si l'action est en favori
     */
    static async isFavorite(userId, symbol) {
        const result = await query(
            'SELECT 1 FROM favorites WHERE user_id = $1 AND symbol = $2',
            [userId, symbol.toUpperCase()]
        );

        return result.rows.length > 0;
    }

    /**
     * Compte le nombre de favoris d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @returns {number} Nombre de favoris
     */
    static async countByUserId(userId) {
        const result = await query(
            'SELECT COUNT(*) as count FROM favorites WHERE user_id = $1',
            [userId]
        );

        return parseInt(result.rows[0].count);
    }

    /**
     * Obtient les favoris avec des informations supplémentaires
     * @param {number} userId - ID de l'utilisateur
     * @returns {Array} Liste des favoris avec métadonnées
     */
    static async getDetailedByUserId(userId) {
        const result = await query(
            `SELECT 
                f.id,
                f.symbol,
                f.company_name,
                f.added_at,
                u.first_name,
                u.last_name
             FROM favorites f
             JOIN users u ON f.user_id = u.id
             WHERE f.user_id = $1
             ORDER BY f.added_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Supprime tous les favoris d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @returns {number} Nombre de favoris supprimés
     */
    static async removeAllByUserId(userId) {
        const result = await query(
            'DELETE FROM favorites WHERE user_id = $1',
            [userId]
        );

        return result.rowCount;
    }

    /**
     * Obtient les actions les plus populaires (les plus ajoutées en favoris)
     * @param {number} limit - Nombre de résultats à retourner
     * @returns {Array} Liste des actions populaires
     */
    static async getMostPopular(limit = 10) {
        const result = await query(
            `SELECT 
                symbol,
                company_name,
                COUNT(*) as favorite_count,
                MAX(added_at) as last_added
             FROM favorites
             GROUP BY symbol, company_name
             ORDER BY favorite_count DESC, last_added DESC
             LIMIT $1`,
            [limit]
        );

        return result.rows;
    }

    /**
     * Obtient les favoris récents de tous les utilisateurs
     * @param {number} limit - Nombre de résultats à retourner
     * @returns {Array} Liste des favoris récents
     */
    static async getRecent(limit = 20) {
        const result = await query(
            `SELECT 
                f.symbol,
                f.company_name,
                f.added_at,
                u.first_name,
                u.last_name
             FROM favorites f
             JOIN users u ON f.user_id = u.id
             ORDER BY f.added_at DESC
             LIMIT $1`,
            [limit]
        );

        return result.rows;
    }

    /**
     * Recherche dans les favoris d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @param {string} searchTerm - Terme de recherche
     * @returns {Array} Favoris correspondant à la recherche
     */
    static async search(userId, searchTerm) {
        const result = await query(
            `SELECT id, symbol, company_name, added_at
             FROM favorites
             WHERE user_id = $1 
             AND (
                 symbol ILIKE $2 
                 OR company_name ILIKE $2
             )
             ORDER BY added_at DESC`,
            [userId, `%${searchTerm}%`]
        );

        return result.rows;
    }

    /**
     * Obtient les statistiques globales des favoris
     * @returns {Object} Statistiques des favoris
     */
    static async getGlobalStats() {
        const result = await query(
            `SELECT 
                COUNT(*) as total_favorites,
                COUNT(DISTINCT user_id) as users_with_favorites,
                COUNT(DISTINCT symbol) as unique_symbols,
                AVG(favorites_per_user.count) as avg_favorites_per_user
             FROM favorites,
             (SELECT user_id, COUNT(*) as count FROM favorites GROUP BY user_id) as favorites_per_user`
        );

        return result.rows[0];
    }
}

module.exports = Favorite;
