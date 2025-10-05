# Guide de Migration : Supabase vers PostgreSQL

## Vue d'ensemble de la migration

Ce guide détaille la migration complète de **Simplified Action** depuis Supabase vers une architecture PostgreSQL + Express.js avec authentification JWT. La migration préserve toutes les fonctionnalités existantes tout en améliorant la sécurité et les performances.

## Comparaison des architectures

### Avant (Supabase)
```
Frontend → Supabase Client → Supabase Cloud
                          ├── Auth (Supabase Auth)
                          ├── Database (PostgreSQL managé)
                          └── API (Auto-générée)
```

### Après (PostgreSQL + Express)
```
Frontend → Express.js → PostgreSQL Local
                     ├── Auth (JWT + bcrypt)
                     ├── Database (PostgreSQL direct)
                     └── API (Express routes)
```

## Changements par composant

### 1. Authentification

#### Avant (Supabase)
```javascript
// Inscription
const { data, error } = await supabase.auth.signUp({
    email: 'user@example.com',
    password: 'password123',
    options: {
        data: {
            first_name: 'John',
            last_name: 'Doe'
        }
    }
});

// Connexion
const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'password123'
});

// Vérification
const { data: { user } } = await supabase.auth.getUser();
```

#### Après (JWT + Express)
```javascript
// Inscription
const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'John',
        lastName: 'Doe'
    })
});

// Connexion
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
    })
});

// Vérification
const response = await fetch('/api/auth/verify', {
    credentials: 'include'
});
```

### 2. Gestion des données

#### Avant (Supabase)
```javascript
// Requête directe à la base
const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId);

// Insertion
const { data, error } = await supabase
    .from('favorites')
    .insert([{ user_id: userId, symbol: 'AAPL' }]);
```

#### Après (API Express)
```javascript
// Requête via API
const response = await fetch('/api/favorites', {
    credentials: 'include'
});
const data = await response.json();

// Insertion
const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        symbol: 'AAPL',
        company_name: 'Apple Inc.'
    })
});
```

### 3. Structure de la base de données

#### Avant (Supabase - Tables auto-générées)
```sql
-- Table profiles (gérée par Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id),
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    is_premium BOOLEAN DEFAULT FALSE
);

-- Table favorites
CREATE TABLE favorites (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    symbol TEXT,
    company_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Après (PostgreSQL - Contrôle total)
```sql
-- Table users (contrôle complet)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table favorites (optimisée)
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

-- Index pour les performances
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_users_email ON users(email);
```

## Étapes de migration

### Étape 1 : Sauvegarde des données Supabase

```bash
# Exporter les données depuis Supabase
# (Utiliser l'interface Supabase ou pg_dump si accès direct)

# Exemple de requêtes d'export
SELECT * FROM profiles ORDER BY created_at;
SELECT * FROM favorites ORDER BY created_at;
```

### Étape 2 : Installation du nouveau système

```bash
# Cloner le projet refactorisé
git clone <nouveau-repository>
cd simplified-action-refactored

# Installer les dépendances
npm install

# Configurer PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Configurer la base de données
npm run setup-db
```

### Étape 3 : Migration des données

```sql
-- Script de migration des utilisateurs
-- (Adapter selon le format d'export Supabase)

INSERT INTO users (email, first_name, last_name, is_premium, created_at)
VALUES 
    ('user1@example.com', 'John', 'Doe', false, '2024-01-01 10:00:00'),
    ('user2@example.com', 'Jane', 'Smith', true, '2024-01-02 11:00:00');

-- Migration des favoris
-- (Nécessite de mapper les UUID Supabase vers les nouveaux ID)
INSERT INTO favorites (user_id, symbol, company_name, added_at)
SELECT 
    u.id,
    f.symbol,
    f.company_name,
    f.created_at
FROM supabase_favorites_export f
JOIN users u ON u.email = f.user_email;
```

### Étape 4 : Mise à jour de la configuration

```env
# Nouveau fichier .env
PORT=3001
FINNHUB_API_KEY=votre_cle_existante

# Configuration PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simplified_action
DB_USER=postgres
DB_PASSWORD=mot_de_passe_securise

# Nouveaux secrets (GÉNÉRER DE NOUVEAUX SECRETS!)
JWT_SECRET=nouveau_secret_jwt_tres_complexe
JWT_EXPIRES_IN=7d
COOKIE_SECRET=nouveau_secret_cookie_tres_complexe
```

### Étape 5 : Tests de validation

```bash
# Démarrer le serveur
npm start

# Tester les fonctionnalités principales
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","confirmPassword":"test123","firstName":"Test","lastName":"User"}'

# Vérifier l'interface utilisateur
# Ouvrir http://localhost:3001 dans le navigateur
```

## Gestion des utilisateurs existants

### Problème des mots de passe
**Important** : Les mots de passe Supabase ne peuvent pas être migrés directement car ils sont hachés avec un algorithme différent.

#### Solutions possibles :

1. **Réinitialisation forcée** (Recommandé)
```javascript
// Forcer tous les utilisateurs à créer un nouveau mot de passe
// Envoyer un email de réinitialisation à tous les utilisateurs
```

2. **Migration avec mot de passe temporaire**
```sql
-- Créer des comptes avec des mots de passe temporaires
INSERT INTO users (email, first_name, last_name, password_hash, is_premium)
SELECT 
    email,
    first_name,
    last_name,
    '$2b$12$temporaryHashForMigration', -- Hash temporaire
    is_premium
FROM supabase_users_export;
```

3. **Double authentification temporaire**
```javascript
// Permettre temporairement l'authentification Supabase ET locale
// Migrer progressivement les utilisateurs
```

## Différences fonctionnelles importantes

### 1. Gestion des sessions

#### Avant (Supabase)
- Sessions gérées automatiquement par Supabase
- Tokens stockés dans localStorage
- Rafraîchissement automatique

#### Après (JWT)
- Sessions gérées par cookies httpOnly
- Tokens JWT avec expiration
- Sécurité renforcée (pas d'accès JavaScript)

### 2. Validation des données

#### Avant (Supabase)
- Validation basique côté client
- Contraintes de base de données

#### Après (Express)
- Validation stricte côté serveur
- Sanitisation des données
- Messages d'erreur personnalisés

### 3. Gestion des erreurs

#### Avant (Supabase)
```javascript
const { data, error } = await supabase.auth.signIn({...});
if (error) {
    console.error('Erreur:', error.message);
}
```

#### Après (Express)
```javascript
try {
    const response = await fetch('/api/auth/login', {...});
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error);
    }
} catch (error) {
    console.error('Erreur:', error.message);
}
```

## Avantages de la migration

### 🔐 Sécurité améliorée
- Contrôle total sur l'authentification
- Hachage bcrypt avec 12 rounds
- Cookies httpOnly sécurisés
- Protection contre les attaques par force brute

### 💰 Réduction des coûts
- Suppression de l'abonnement Supabase
- Hébergement local ou cloud moins cher
- Pas de limites de requêtes externes

### ⚡ Performances optimisées
- Requêtes SQL directes
- Pas de latence réseau vers Supabase
- Cache et optimisations personnalisées

### 🛠️ Flexibilité de développement
- Contrôle total du schéma de base de données
- APIs personnalisées selon les besoins
- Intégrations tierces facilitées

## Problèmes potentiels et solutions

### 1. Temps d'arrêt pendant la migration
**Solution** : Migration en mode maintenance avec page d'information

### 2. Perte de données pendant la migration
**Solution** : Sauvegardes multiples et tests sur environnement de staging

### 3. Utilisateurs perdus (mots de passe)
**Solution** : Communication claire et processus de récupération simplifié

### 4. Fonctionnalités manquantes temporairement
**Solution** : Migration par phases avec fonctionnalités prioritaires d'abord

## Checklist de migration

### Pré-migration
- [ ] Sauvegarde complète des données Supabase
- [ ] Test du nouveau système sur environnement de staging
- [ ] Communication aux utilisateurs
- [ ] Préparation des scripts de migration

### Migration
- [ ] Mise en mode maintenance
- [ ] Export des données Supabase
- [ ] Installation du nouveau système
- [ ] Import des données dans PostgreSQL
- [ ] Tests de validation
- [ ] Mise en production

### Post-migration
- [ ] Monitoring des erreurs
- [ ] Support utilisateurs pour les problèmes de connexion
- [ ] Optimisation des performances
- [ ] Sauvegarde du nouveau système

## Support post-migration

### Documentation utilisateur
- Guide de reconnexion pour les utilisateurs existants
- FAQ sur les changements
- Procédure de récupération de compte

### Monitoring technique
- Logs d'erreurs d'authentification
- Performances de la base de données
- Utilisation des ressources serveur

---

Cette migration représente une amélioration significative de l'architecture tout en préservant l'expérience utilisateur. Le système résultant est plus sécurisé, performant et économique.
