const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

// Import des modules locaux
const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const favoritesRoutes = require('./routes/favorites');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration de sécurité avec Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://finnhub.io", "https://datahub.io", "https://en.wikipedia.org", "https://financialmodelingprep.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// Middlewares de base
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Configuration des fichiers statiques avec types MIME corrects
app.use(express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'text/javascript');
        }
    }
}));

app.use("/css", express.static(path.join(__dirname, "css"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

app.use("/js", express.static(path.join(__dirname, "js"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'text/javascript');
        }
    }
}));

app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'text/javascript');
        }
    }
}));

// Clés API depuis le .env
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
    console.error("⚠️  ERREUR: FINNHUB_API_KEY non trouvée dans .env");
    console.log("💡 Créez un fichier .env avec: FINNHUB_API_KEY=votre_cle_api");
}

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/favorites', favoritesRoutes);

/**
 * 🔍 Recherche de symboles boursiers avec Finnhub
 */
app.get("/api/search/:query", async (req, res) => {
    const query = req.params.query;
    
    try {
        const searchUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (!data.result || data.result.length === 0) {
            return res.json({
                success: false,
                error: `Aucune entreprise trouvée pour "${query}"`
            });
        }
        
        // Filtre et formate les résultats
        const results = data.result
            .filter(item => item.type === "Common Stock" && !item.symbol.includes("."))
            .slice(0, 5)
            .map(item => ({
                symbol: item.symbol,
                description: item.description
            }));
        
        res.json({
            success: results.length > 0,
            data: results
        });
        
    } catch (error) {
        console.error("Erreur recherche Finnhub:", error);
        res.json({
            success: false,
            error: "Erreur lors de la recherche"
        });
    }
});

/**
 * 📈 Données boursières en temps réel avec Finnhub
 */
app.get("/api/stocks/:symbol", async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    
    try {
        // 1. Quote en temps réel
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
        const quoteResponse = await fetch(quoteUrl);
        const quoteData = await quoteResponse.json();
        
        // Vérification si le symbole existe
        if (!quoteData.c || quoteData.c === 0) {
            return res.json({
                success: false,
                error: `Symbole "${symbol}" non trouvé ou marché fermé`
            });
        }
        
        // 2. Informations sur la compagnie
        const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
        const profileResponse = await fetch(profileUrl);
        const profileData = await profileResponse.json();
        
        // Extraction des données
        const currentPrice = quoteData.c;        // Prix actuel
        const openPrice = quoteData.o;           // Ouverture
        const highPrice = quoteData.h;           // Plus haut
        const lowPrice = quoteData.l;            // Plus bas
        const prevClose = quoteData.pc;          // Clôture précédente
        const change = currentPrice - prevClose; // Variation absolue
        const changePercent = (change / prevClose) * 100; // Variation %
        
        // Calcul du score intelligent
        let score = 50; // Score de base
        
        // Score basé sur la performance du jour
        score += Math.min(Math.max(changePercent * 3, -30), 30);
        
        // Score basé sur la position dans la fourchette du jour
        if (highPrice !== lowPrice) {
            const dayPosition = (currentPrice - lowPrice) / (highPrice - lowPrice);
            score += (dayPosition - 0.5) * 20;
        }
        
        // Score basé sur le volume (si disponible)
        if (quoteData.v && profileData.shareOutstanding) {
            const volumeRatio = quoteData.v / (profileData.shareOutstanding * 0.01); // Volume vs 1% des actions
            if (volumeRatio > 1) score += 5; // Volume élevé = +5 points
        }
        
        // Limiter le score entre 0 et 100
        score = Math.max(0, Math.min(100, Math.round(score)));
        
        const stockData = {
            symbol: symbol,
            companyName: profileData.name || symbol,
            price: `$${currentPrice.toFixed(2)}`,
            percentChange: changePercent,
            change: `$${change.toFixed(2)}`,
            open: `$${openPrice.toFixed(2)}`,
            high: `$${highPrice.toFixed(2)}`,
            low: `$${lowPrice.toFixed(2)}`,
            prevClose: `$${prevClose.toFixed(2)}`,
            volume: quoteData.v ? quoteData.v.toLocaleString() : "N/A",
            score: score,
            timeframe: "Temps réel",
            marketCap: profileData.marketCapitalization ? 
                `$${(profileData.marketCapitalization / 1000).toFixed(1)}B` : "N/A",
            sector: profileData.finnhubIndustry || "N/A"
        };
        
        res.json({
            success: true,
            data: stockData
        });
        
    } catch (error) {
        console.error("Erreur récupération stock Finnhub:", error);
        res.json({
            success: false,
            error: "Erreur lors de la récupération des données"
        });
    }
});

/**
 * 🌍 Statut du marché
 */
app.get("/api/market-status", async (req, res) => {
    try {
        const statusUrl = `https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${FINNHUB_API_KEY}`;
        const response = await fetch(statusUrl);
        const data = await response.json();
        
        res.json({
            success: true,
            data: {
                isOpen: data.isOpen,
                session: data.session,
                timezone: data.timezone,
                holiday: data.holiday || null
            }
        });
    } catch (error) {
        console.error("Erreur statut marché:", error);
        res.json({
            success: false,
            error: "Erreur lors de la récupération du statut du marché"
        });
    }
});

/**
 * 📄 Proxy CSV S&P500 (DataHub → frontend)
 */
app.get("/api/sp500", async (req, res) => {
    try {
        const url = "https://datahub.io/core/s-and-p-500-companies/r/constituents.csv";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Échec du téléchargement (${response.status})`);
        }
        const csv = await response.text();
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.send(csv);
    } catch (err) {
        console.error("Erreur /api/sp500:", err);
        res.status(500).json({ error: "Impossible de charger la liste S&P500" });
    }
});

/**
 * 🏠 Route principale
 */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/**
 * 🔧 Route de santé pour vérifier le statut du serveur
 */
app.get("/api/health", async (req, res) => {
    try {
        const dbStatus = await testConnection();
        
        res.json({
            success: true,
            status: "healthy",
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus ? "connected" : "disconnected",
                finnhub: FINNHUB_API_KEY ? "configured" : "not_configured"
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "unhealthy",
            error: error.message
        });
    }
});

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
    console.error('Erreur non gérée:', error);
    res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
    });
});

// Gestionnaire pour les routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route non trouvée'
    });
});

// Démarrage du serveur
async function startServer() {
    try {
        // Tester la connexion à la base de données
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error("❌ Impossible de se connecter à la base de données");
            console.log("💡 Vérifiez votre configuration PostgreSQL dans .env");
            console.log("💡 Exécutez 'npm run setup-db' pour configurer la base de données");
        }

        app.listen(PORT, () => {
            console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
            console.log(`📊 API Finnhub: ${FINNHUB_API_KEY ? "✅ Configurée" : "❌ Manquante"}`);
            console.log(`🗄️  PostgreSQL: ${dbConnected ? "✅ Connecté" : "❌ Déconnecté"}`);
            console.log(`🔐 Authentification: ✅ JWT activé`);
            
            if (!dbConnected) {
                console.log("\n⚠️  Le serveur fonctionne mais la base de données n'est pas accessible");
                console.log("   Les fonctionnalités d'authentification et de favoris ne fonctionneront pas");
            }
        });
    } catch (error) {
        console.error("❌ Erreur lors du démarrage du serveur:", error);
        process.exit(1);
    }
}

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt du serveur en cours...');
    
    try {
        const { closePool } = require('./config/database');
        await closePool();
        console.log('✅ Connexions base de données fermées');
    } catch (error) {
        console.error('❌ Erreur lors de la fermeture:', error);
    }
    
    process.exit(0);
});

startServer();
