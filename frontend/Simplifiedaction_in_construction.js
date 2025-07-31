async function searchQuote() {
    const symbol = document.getElementById('symbolInput').value.toUpperCase();
    const resultEl = document.getElementById('result');

    if (!symbol) {
        resultEl.textContent = "Veuillez entrer un symbole.";
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/quote?symbol=${symbol}`);
        const data = await response.json();

        if (data.c) {
            resultEl.textContent = `
Cours actuel : ${data.c} $
Ouverture : ${data.o} $
Plus haut : ${data.h} $
Plus bas : ${data.l} $
Variation : ${((data.c - data.o) / data.o * 100).toFixed(2)} %
            `;
        } else {
            resultEl.textContent = "Aucune donnée trouvée pour ce symbole.";
        }

    } catch (error) {
        resultEl.textContent = "Erreur lors de la récupération des données.";
        console.error(error);
    }
}
