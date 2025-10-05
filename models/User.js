const bcrypt = require('bcrypt');
const { query } = require('../config/database');

class User {
    /**
     * Crée un nouvel utilisateur
     * @param {Object} userData - Données de l'utilisateur
     * @returns {Object} Utilisateur créé
     */
    static async create(userData) {
        const { email, password, firstName, lastName } = userData;

        // Hacher le mot de passe
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const result = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, first_name, last_name, is_premium, created_at`,
            [email.toLowerCase(), passwordHash, firstName, lastName]
        );

        return result.rows[0];
    }

    /**
     * Trouve un utilisateur par email
     * @param {string} email - Email de l'utilisateur
     * @returns {Object|null} Utilisateur trouvé ou null
     */
    static async findByEmail(email) {
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        return result.rows[0] || null;
    }

    /**
     * Trouve un utilisateur par ID
     * @param {number} id - ID de l'utilisateur
     * @returns {Object|null} Utilisateur trouvé ou null
     */
    static async findById(id) {
        const result = await query(
            'SELECT id, email, first_name, last_name, is_premium, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );

        return result.rows[0] || null;
    }

    /**
     * Vérifie le mot de passe d'un utilisateur
     * @param {string} password - Mot de passe en clair
     * @param {string} hash - Hash stocké en base
     * @returns {boolean} True si le mot de passe est correct
     */
    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Met à jour le profil d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @param {Object} updateData - Données à mettre à jour
     * @returns {Object} Utilisateur mis à jour
     */
    static async updateProfile(userId, updateData) {
        const { firstName, lastName } = updateData;

        const result = await query(
            `UPDATE users 
             SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, email, first_name, last_name, is_premium, created_at, updated_at`,
            [firstName, lastName, userId]
        );

        return result.rows[0];
    }

    /**
     * Met à jour le statut Premium d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @param {boolean} isPremium - Nouveau statut Premium
     * @returns {Object} Utilisateur mis à jour
     */
    static async updatePremiumStatus(userId, isPremium) {
        const result = await query(
            `UPDATE users 
             SET is_premium = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, email, first_name, last_name, is_premium, created_at, updated_at`,
            [isPremium, userId]
        );

        return result.rows[0];
    }

    /**
     * Vérifie si un email existe déjà
     * @param {string} email - Email à vérifier
     * @returns {boolean} True si l'email existe
     */
    static async emailExists(email) {
        const result = await query(
            'SELECT 1 FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        return result.rows.length > 0;
    }

    /**
     * Obtient les statistiques d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @returns {Object} Statistiques utilisateur
     */
    static async getStats(userId) {
        // Compter les favoris
        const favoritesResult = await query(
            'SELECT COUNT(*) as favorites_count FROM favorites WHERE user_id = $1',
            [userId]
        );

        // Obtenir la date de création du compte
        const userResult = await query(
            'SELECT created_at FROM users WHERE id = $1',
            [userId]
        );

        return {
            favorites_count: parseInt(favoritesResult.rows[0].favorites_count),
            member_since: userResult.rows[0].created_at
        };
    }

    /**
     * Change le mot de passe d'un utilisateur
     * @param {number} userId - ID de l'utilisateur
     * @param {string} newPassword - Nouveau mot de passe
     * @returns {boolean} True si le changement a réussi
     */
    static async changePassword(userId, newPassword) {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        const result = await query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [passwordHash, userId]
        );

        return result.rowCount > 0;
    }

    /**
     * Supprime un utilisateur et toutes ses données associées
     * @param {number} userId - ID de l'utilisateur
     * @returns {boolean} True si la suppression a réussi
     */
    static async delete(userId) {
        // Les favoris seront supprimés automatiquement grâce à ON DELETE CASCADE
        const result = await query(
            'DELETE FROM users WHERE id = $1',
            [userId]
        );

        return result.rowCount > 0;
    }

    /**
     * Obtient la liste de tous les utilisateurs (pour l'administration)
     * @param {number} limit - Limite de résultats
     * @param {number} offset - Décalage pour la pagination
     * @returns {Array} Liste des utilisateurs
     */
    static async getAll(limit = 50, offset = 0) {
        const result = await query(
            `SELECT id, email, first_name, last_name, is_premium, created_at, updated_at
             FROM users
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return result.rows;
    }
}

module.exports = User;
