const express = require("express");
const path = require("path");
require("dotenv").config(); // Pour lire le fichier .env
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory first
app.use(express.static(path.join(__dirname, "public")));

// Serve static files from the 'css' and 'js' directories
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));

// Serve other static files directly from the root of the project
// This should be after specific paths like /css and /js to avoid conflicts
app.use(express.static(path.join(__dirname)));

// Clés API depuis le .env
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!FINNHUB_API_KEY) {
    console.error("⚠️  ERREUR: FINNHUB_API_KEY non trouvée dans .env");
    console.log("💡 Créez un fichier .env avec: FINNHUB_API_KEY=votre_cle_api");
}

if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("⚠️  ERREUR: Clés Supabase non trouvées dans .env");
    console.log("💡 Ajoutez dans .env: NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * 🔐 Configuration Supabase pour le client
 */
app.get("/api/supabase-config", (req, res) => {
    if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return res.json({
            success: false,
            error: "Configuration Supabase non disponible"
        });
    }

    res.json({
        success: true,
        url: NEXT_PUBLIC_SUPABASE_URL,
        key: NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
});

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

// Serve main HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 API Finnhub: ${FINNHUB_API_KEY ? "✅ Configurée" : "❌ Manquante"}`);
    console.log(`🔐 Supabase: ${NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Configuré" : "❌ Manquant"}`);
});

app.use(express.static('public'));
