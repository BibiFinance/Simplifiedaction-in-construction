require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

app.get('/quote', async (req, res) => {
  const symbol = req.query.symbol;
  const apiKey = process.env.FINNHUB_API_KEY;

  try {
    const response = await axios.get('https://finnhub.io/api/v1/quote', {
      params: { symbol, token: apiKey }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend démarré sur http://localhost:${PORT}`);
});
