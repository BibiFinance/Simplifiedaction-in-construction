// backend/server.js
const dotenv = require('dotenv');
const result = dotenv.config({ path: __dirname + '/.env' });

if (result.error) {
  console.error("❌ Erreur lors du chargement du fichier .env :", result.error);
} else {
  console.log("✅ .env chargé :", result.parsed);
}

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/api/quote', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'No symbol provided' });

  try {
    const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
      params: {
        symbol,
        token: process.env.FINNHUB_API_KEY
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
});
