// Données simulées pour les actions
const data = [
    { ticker: 'AAPL', nom: 'Apple Inc.', rendement: '8.2%', risque: 'Modéré' },
    { ticker: 'MSFT', nom: 'Microsoft Corp.', rendement: '7.5%', risque: 'Faible' },
    { ticker: 'TSLA', nom: 'Tesla Inc.', rendement: '12.3%', risque: 'Élevé' },
    { ticker: 'AMZN', nom: 'Amazon.com Inc.', rendement: '9.1%', risque: 'Modéré' },
    { ticker: 'NVDA', nom: 'NVIDIA Corp.', rendement: '11.0%', risque: 'Élevé' }
];

// Récupération des éléments HTML
const searchBox = document.getElementById('search-box');
const resultsTableBody = document.querySelector('#results-table tbody');

// Événement déclenché à chaque saisie dans le champ de recherche
searchBox.addEventListener('input', function(event) {
    const query = event.target.value.trim().toLowerCase(); // Texte entré
    resultsTableBody.innerHTML = ''; // Vide les résultats précédents

    // Lancer la recherche si au moins 3 caractères sont entrés
    if (query.length >= 3) {
        const filtered = data.filter(item =>
            item.ticker.toLowerCase().includes(query) ||
            item.nom.toLowerCase().includes(query)
        );

        // Affiche les résultats correspondants
        if (filtered.length > 0) {
            filtered.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.ticker}</td>
                    <td>${item.nom}</td>
                    <td>${item.rendement}</td>
                    <td>${item.risque}</td>
                `;
                resultsTableBody.appendChild(row);
            });
        } else {
            // Aucun résultat trouvé
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4">Aucun résultat trouvé.</td>`;
            resultsTableBody.appendChild(row);
        }
    }
});
