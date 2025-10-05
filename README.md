# Simplified Action - Version Refactorisée

## Vue d'ensemble

**Simplified Action** est une plateforme d'investissement simplifié qui permet aux utilisateurs de rechercher des actions, consulter leurs données en temps réel et gérer leurs favoris. Cette version a été entièrement refactorisée pour remplacer Supabase par une solution basée sur **PostgreSQL** et **Express.js** avec authentification JWT.

## Changements majeurs

### ✅ Suppression complète de Supabase
- Remplacement de l'authentification Supabase par JWT
- Migration des données vers PostgreSQL
- Nouvelles API Express pour toutes les fonctionnalités

### 🔐 Système d'authentification sécurisé
- Hachage des mots de passe avec bcrypt (12 rounds)
- Tokens JWT avec cookies httpOnly sécurisés
- Protection contre les attaques par force brute
- Validation stricte des données côté serveur

### 🗄️ Base de données PostgreSQL
- Schéma optimisé avec contraintes et index
- Triggers automatiques pour les timestamps
- Gestion des relations avec clés étrangères
- Sauvegarde et restauration simplifiées

## Architecture technique

### Backend (Express.js)
```
├── server.js              # Serveur principal
├── config/
│   └── database.js        # Configuration PostgreSQL
├── middleware/
│   └── auth.js           # Middlewares d'authentification
├── models/
│   ├── User.js           # Modèle utilisateur
│   └── Favorite.js       # Modèle favoris
├── routes/
│   ├── auth.js           # Routes d'authentification
│   ├── user.js           # Routes utilisateur
│   └── favorites.js      # Routes favoris
├── utils/
│   ├── jwt.js            # Utilitaires JWT
│   └── validation.js     # Validation des données
└── scripts/
    └── setup-database.js # Configuration BDD
```

### Frontend (JavaScript Vanilla)
```
├── js/
│   ├── auth.js           # Gestionnaire d'authentification
│   ├── auth-guard.js     # Protection des pages
│   └── favorites.js      # Gestion des favoris
├── *.html                # Pages de l'application
└── *.css                 # Styles (inchangés)
```

### Base de données PostgreSQL
```sql
-- Table des utilisateurs
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

-- Table des favoris
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);
```

## Installation et configuration

### Prérequis
- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd simplified-action-refactored

# Installer les dépendances
npm install

# Configurer PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurer l'utilisateur PostgreSQL
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Configuration
1. Copier le fichier `.env` et ajuster les variables :
```bash
cp .env.example .env
```

2. Variables d'environnement importantes :
```env
# Configuration du serveur
PORT=3001

# API externe Finnhub
FINNHUB_API_KEY=votre_cle_finnhub

# Configuration PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simplified_action
DB_USER=postgres
DB_PASSWORD=postgres

# Configuration JWT (CHANGEZ EN PRODUCTION!)
JWT_SECRET=votre_secret_jwt_super_securise
JWT_EXPIRES_IN=7d
COOKIE_SECRET=votre_secret_cookie_super_securise
```

### Initialisation de la base de données
```bash
# Créer les tables et la structure
npm run setup-db
```

### Démarrage
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

L'application sera accessible sur `http://localhost:3001`

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/verify` - Vérification du token
- `GET /api/auth/status` - Statut d'authentification

### Utilisateur
- `GET /api/user/profile` - Profil utilisateur
- `PUT /api/user/profile` - Mise à jour du profil
- `GET /api/user/stats` - Statistiques utilisateur
- `POST /api/user/upgrade-premium` - Upgrade Premium (démo)

### Favoris
- `GET /api/favorites` - Liste des favoris
- `POST /api/favorites` - Ajouter un favori
- `DELETE /api/favorites/:symbol` - Supprimer un favori
- `GET /api/favorites/:symbol/check` - Vérifier si en favoris
- `GET /api/favorites/stats` - Statistiques des favoris

### Données boursières (inchangées)
- `GET /api/search/:query` - Recherche d'actions
- `GET /api/stocks/:symbol` - Données d'une action
- `GET /api/market-status` - Statut du marché
- `GET /api/sp500` - Liste S&P 500

## Fonctionnalités

### ✅ Authentification complète
- Inscription avec validation stricte
- Connexion sécurisée avec JWT
- Gestion des sessions avec cookies httpOnly
- Protection contre les attaques par force brute

### ✅ Gestion des favoris
- Ajout/suppression d'actions favorites
- Limite de 5 favoris pour les comptes gratuits
- Favoris illimités pour les comptes Premium
- Interface utilisateur préservée à l'identique

### ✅ Système Premium/Gratuit
- Différenciation des fonctionnalités selon le statut
- Upgrade Premium simulé (pour démonstration)
- Gestion des limites côté serveur

### ✅ Données boursières en temps réel
- API Finnhub pour les données de marché
- Recherche d'entreprises par nom ou symbole
- Calcul de score intelligent
- Liste complète du S&P 500

## Sécurité

### Mesures implémentées
- **Hachage des mots de passe** : bcrypt avec 12 rounds
- **Tokens JWT sécurisés** : Expiration automatique, cookies httpOnly
- **Validation des données** : Côté serveur avec règles strictes
- **Protection CSRF** : Cookies SameSite strict
- **Rate limiting** : Protection contre les attaques par force brute
- **Headers de sécurité** : Helmet.js pour les en-têtes HTTP
- **Validation des entrées** : Sanitisation et validation complète

### Bonnes pratiques
- Secrets JWT et cookies différents et complexes
- Variables d'environnement pour toutes les configurations sensibles
- Gestion propre des erreurs sans exposition d'informations
- Logs de sécurité pour le monitoring

## Tests

### Tests automatisés inclus
Le système a été testé avec les scénarios suivants :
- ✅ Inscription d'un nouvel utilisateur
- ✅ Connexion avec email/mot de passe
- ✅ Ajout d'actions aux favoris
- ✅ Récupération de la liste des favoris
- ✅ Suppression d'actions des favoris
- ✅ Recherche d'actions par nom
- ✅ Récupération de données boursières
- ✅ Déconnexion utilisateur

### Tests manuels recommandés
1. **Interface utilisateur** : Vérifier que toutes les pages fonctionnent
2. **Authentification** : Tester les cas d'erreur (mauvais mot de passe, etc.)
3. **Favoris** : Vérifier les limites pour les comptes gratuits
4. **Responsive** : Tester sur différentes tailles d'écran

## Migration depuis l'ancienne version

### Données utilisateur
Si vous avez des données existantes dans Supabase, vous devrez :
1. Exporter les données depuis Supabase
2. Adapter le format pour PostgreSQL
3. Importer dans la nouvelle base de données

### Script de migration (exemple)
```sql
-- Exemple d'import depuis un export Supabase
INSERT INTO users (email, first_name, last_name, is_premium, created_at)
SELECT email, first_name, last_name, is_premium, created_at
FROM supabase_export_users;

INSERT INTO favorites (user_id, symbol, company_name, added_at)
SELECT u.id, f.symbol, f.company_name, f.added_at
FROM supabase_export_favorites f
JOIN users u ON u.email = f.user_email;
```

## Déploiement en production

### Variables d'environnement à modifier
```env
NODE_ENV=production
JWT_SECRET=secret_jwt_production_tres_complexe
COOKIE_SECRET=secret_cookie_production_tres_complexe
DB_PASSWORD=mot_de_passe_production_securise
```

### Recommandations
- Utiliser HTTPS en production
- Configurer un reverse proxy (nginx)
- Mettre en place des sauvegardes automatiques PostgreSQL
- Monitoring des logs et des performances
- Utiliser un gestionnaire de processus (PM2)

## Support et maintenance

### Logs
Les logs sont disponibles dans :
- Console du serveur pour les erreurs
- `server.log` en mode background
- Logs PostgreSQL dans `/var/log/postgresql/`

### Monitoring
- Endpoint de santé : `GET /api/health`
- Vérification de la base de données incluse
- Statut des services externes (Finnhub)

### Sauvegarde
```bash
# Sauvegarde PostgreSQL
pg_dump -U postgres simplified_action > backup.sql

# Restauration
psql -U postgres simplified_action < backup.sql
```

## Contribution

### Structure du code
- Code modulaire et bien organisé
- Commentaires en français
- Gestion d'erreurs complète
- Validation stricte des données

### Standards
- ES6+ pour le JavaScript
- Async/await pour les opérations asynchrones
- Nommage en français pour les variables métier
- Documentation inline pour les fonctions complexes

---

## Résumé des améliorations

Cette refactorisation apporte :
- **🔐 Sécurité renforcée** avec JWT et bcrypt
- **🗄️ Contrôle total** des données avec PostgreSQL
- **⚡ Performances optimisées** sans couche d'abstraction
- **💰 Économies** en supprimant la dépendance Supabase
- **🛠️ Flexibilité** pour les développements futurs
- **📱 Interface préservée** pour les utilisateurs existants

Le système est maintenant entièrement autonome et prêt pour la production !
