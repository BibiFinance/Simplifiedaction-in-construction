const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
    // Configuration pour se connecter à PostgreSQL (sans spécifier de base)
    const adminClient = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres' // Base par défaut pour créer la nouvelle base
    });

    try {
        await adminClient.connect();
        console.log('✅ Connexion à PostgreSQL établie');

        // Créer la base de données si elle n'existe pas
        try {
            await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`✅ Base de données '${process.env.DB_NAME}' créée`);
        } catch (error) {
            if (error.code === '42P04') {
                console.log(`ℹ️  Base de données '${process.env.DB_NAME}' existe déjà`);
            } else {
                throw error;
            }
        }

        await adminClient.end();

        // Se connecter à la nouvelle base de données
        const dbClient = new Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await dbClient.connect();
        console.log(`✅ Connexion à la base '${process.env.DB_NAME}' établie`);

        // Créer la table users
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                is_premium BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await dbClient.query(createUsersTable);
        console.log('✅ Table users créée');

        // Créer la table favorites
        const createFavoritesTable = `
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                symbol VARCHAR(10) NOT NULL,
                company_name VARCHAR(255),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, symbol)
            );
        `;

        await dbClient.query(createFavoritesTable);
        console.log('✅ Table favorites créée');

        // Créer un index sur user_id pour optimiser les requêtes
        const createIndexes = `
            CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `;

        await dbClient.query(createIndexes);
        console.log('✅ Index créés');

        // Créer une fonction pour mettre à jour updated_at automatiquement
        const createUpdateFunction = `
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `;

        await dbClient.query(createUpdateFunction);
        console.log('✅ Fonction de mise à jour créée');

        // Créer le trigger pour la table users
        const createTrigger = `
            DROP TRIGGER IF EXISTS update_users_updated_at ON users;
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `;

        await dbClient.query(createTrigger);
        console.log('✅ Trigger de mise à jour créé');

        await dbClient.end();
        console.log('🎉 Configuration de la base de données terminée avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors de la configuration de la base de données:', error);
        process.exit(1);
    }
}

// Exécuter le script si appelé directement
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
