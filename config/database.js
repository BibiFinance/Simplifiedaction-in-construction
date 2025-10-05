const { Pool } = require('pg');
require('dotenv').config();

// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // Nombre maximum de connexions dans le pool
    idleTimeoutMillis: 30000, // Temps avant fermeture d'une connexion inactive
    connectionTimeoutMillis: 2000, // Temps d'attente pour obtenir une connexion
});

// Gestionnaire d'erreurs pour le pool
pool.on('error', (err, client) => {
    console.error('Erreur inattendue sur le client PostgreSQL:', err);
    process.exit(-1);
});

// Fonction pour exécuter une requête
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Requête exécutée:', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la requête:', error);
        throw error;
    }
}

// Fonction pour obtenir un client du pool (pour les transactions)
async function getClient() {
    return await pool.connect();
}

// Fonction pour fermer le pool proprement
async function closePool() {
    await pool.end();
    console.log('Pool de connexions PostgreSQL fermé');
}

// Fonction de test de connexion
async function testConnection() {
    try {
        const result = await query('SELECT NOW() as current_time');
        console.log('✅ Connexion PostgreSQL OK:', result.rows[0].current_time);
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion PostgreSQL:', error.message);
        return false;
    }
}

module.exports = {
    query,
    getClient,
    closePool,
    testConnection,
    pool
};
