document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');

    /**
     * 🖼️ Affiche la carte d'une action avec plus d'infos
     */
    function displayStock(stock) {
        let colorClass = 'red';
        let trendIcon = '📉';
        
        if (stock.score >= 70) {
            colorClass = 'green';
            trendIcon = '📈';
        } else if (stock.score >= 40) {
            colorClass = 'orange';
            trendIcon = '📊';
        }

        // Couleur pour la variation
        const changeColor = stock.percentChange >= 0 ? '#109c84' : '#e63946';
        const changeSign = stock.percentChange >= 0 ? '+' : '';

        resultsDiv.innerHTML = `
            <div class="stock-card">
                <div class="stock-header">
                    <h2>${stock.symbol}</h2>
                    <span class="trend-icon">${trendIcon}</span>
                </div>
                
                ${stock.companyName ? `<p class="company-name">${stock.companyName}</p>` : ''}
                
                <div class="price-section">
                    <p class="current-price">${stock.price}</p>
                    <p class="price-change" style="color: ${changeColor}">
                        ${changeSign}${stock.percentChange.toFixed(2)}% 
                        ${stock.change ? `(${stock.change})` : ''}
                    </p>
                </div>

                <div class="market-data">
                    <div class="data-row">
                        <span>Ouverture :</span><span>${stock.open}</span>
                    </div>
                    <div class="data-row">
                        <span>Plus haut :</span><span>${stock.high}</span>
                    </div>
                    <div class="data-row">
                        <span>Plus bas :</span><span>${stock.low}</span>
                    </div>
                    <div class="data-row">
                        <span>Clôture préc. :</span><span>${stock.prevClose}</span>
                    </div>
                    ${stock.volume ? `
                    <div class="data-row">
                        <span>Volume :</span><span>${stock.volume}</span>
                    </div>` : ''}
                    ${stock.marketCap ? `
                    <div class="data-row">
                        <span>Capitalisation :</span><span>${stock.marketCap}</span>
                    </div>` : ''}
                </div>

                <div class="score-section">
                    <p><strong>Score Simplified :</strong> ${stock.score}%</p>
                    <div class="score-bar">
                        <div class="score-fill ${colorClass}" style="width:0%"></div>
                    </div>
                    <p class="score-explanation">
                        ${getScoreExplanation(stock.score)}
                    </p>
                </div>

                <div class="metadata">
                    ${stock.sector ? `<span class="sector-tag">${stock.sector}</span>` : ''}
                    <p class="timeframe"><em>📊 ${stock.timeframe}</em></p>
                </div>
            </div>
        `;

        // ⏱️ Animation de la barre de score
        setTimeout(() => {
            const fill = document.querySelector('.score-fill');
            if (fill) fill.style.width = `${stock.score}%`;
        }, 100);
    }

    /**
     * 📝 Explication du score
     */
    function getScoreExplanation(score) {
        if (score >= 80) return "🔥 Excellente performance aujourd'hui";
        if (score >= 70) return "✅ Bonne performance";
        if (score >= 60) return "👍 Performance positive";
        if (score >= 40) return "📊 Performance neutre";
        if (score >= 20) return "⚠️ Performance faible";
        return "📉 Performance décevante";
    }

    /**
     * 📊 Récupère les infos boursières pour un ticker
     */
    async function fetchStockBySymbol(symbol) {
        try {
            resultsDiv.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Récupération des données pour ${symbol}...</p>
                </div>
            `;
            
            const res = await fetch(`/api/stocks/${symbol}`);
            const data = await res.json();

            if (!data.success) {
                resultsDiv.innerHTML = `
                    <div class="error">
                        <h3>❌ Erreur</h3>
                        <p>${data.error || `Aucune donnée trouvée pour "${symbol}"`}</p>
                        <small>Vérifiez que le symbole est correct (ex: AAPL, GOOGL, TSLA)</small>
                    </div>
                `;
                return;
            }

            displayStock(data.data);
        } catch (err) {
            console.error('Erreur de requête :', err);
            resultsDiv.innerHTML = `
                <div class="error">
                    <h3>🌐 Erreur de connexion</h3>
                    <p>Impossible de récupérer les données</p>
                    <small>Vérifiez votre connexion internet</small>
                </div>
            `;
        }
    }

    /**
     * 🔎 Recherche par nom ou ticker
     */
    async function fetchStock(query) {
        if (!query) return;
        let symbol = query.toUpperCase();

        // Vérifie si c'est un ticker (1-5 lettres majuscules)
        const isTicker = /^[A-Z]{1,5}$/.test(symbol);

        if (isTicker) {
            // Si l'utilisateur a déjà mis le ticker → recherche directe
            fetchStockBySymbol(symbol);
        } else {
            try {
                resultsDiv.innerHTML = `
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Recherche de "${query}"...</p>
                    </div>
                `;
                
                // Appel au backend pour chercher l'entreprise
                const searchRes = await fetch(`/api/search/${encodeURIComponent(query)}`);
                const searchData = await searchRes.json();

                if (!searchData.success || searchData.data.length === 0) {
                    resultsDiv.innerHTML = `
                        <div class="error">
                            <h3>🔍 Aucun résultat</h3>
                            <p>Aucune entreprise trouvée pour "${query}"</p>
                            <small>Essayez avec le symbole exact (ex: AAPL pour Apple)</small>
                        </div>
                    `;
                    return;
                }

                // ✅ Cas 1 : un seul résultat → on affiche directement
                if (searchData.data.length === 1) {
                    fetchStockBySymbol(searchData.data[0].symbol);
                    return;
                }

                // ✅ Cas 2 : plusieurs résultats → on affiche une liste cliquable
                resultsDiv.innerHTML = `
                    <div class="search-results">
                        <h3>🔍 Résultats pour "${query}" :</h3>
                        <p class="search-hint">Cliquez sur une entreprise pour voir ses données :</p>
                    </div>
                `;
                
                const list = document.createElement('ul');
                list.classList.add('results-list');

                searchData.data.forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>${item.symbol}</strong>
                        <span class="company-desc">${item.description}</span>
                    `;
                    li.classList.add('result-item');

                    // Clique → affiche l'action choisie
                    li.addEventListener('click', () => {
                        input.value = item.symbol; // Met le symbole dans l'input
                        fetchStockBySymbol(item.symbol);
                    });

                    list.appendChild(li);
                });

                resultsDiv.querySelector('.search-results').appendChild(list);

            } catch (err) {
                console.error('Erreur recherche :', err);
                resultsDiv.innerHTML = `
                    <div class="error">
                        <h3>🌐 Erreur de recherche</h3>
                        <p>Impossible d'effectuer la recherche</p>
                        <small>Vérifiez votre connexion internet</small>
                    </div>
                `;
            }
        }
    }

    /**
     * ⌨️ Lance la recherche quand on appuie sur Entrée
     */
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = input.value.trim();
            fetchStock(query);
        }
    });

    // 🎯 Recherche automatique si l'utilisateur colle un symbole
    input.addEventListener('paste', (e) => {
        setTimeout(() => {
            const query = input.value.trim();
            if (/^[A-Z]{1,5}$/.test(query)) {
                fetchStock(query);
            }
        }, 100);
    });
});
