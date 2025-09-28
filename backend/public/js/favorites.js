// favorites.js - Gestion des favoris sur la page d'accueil
let supabaseClient = null;
let userFavorites = new Set();
let userProfile = null;

// Initialiser le système de favoris
async function initFavorites() {
    try {
        supabaseClient = await initSupabase();
        await loadUserProfile();
        await loadUserFavorites();
    } catch (error) {
        console.error('Erreur initialisation favoris:', error);
    }
}

// Charger le profil utilisateur
async function loadUserProfile() {
    try {
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        if (!token) return;

        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            userProfile = data.data;
        }
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

// Charger les favoris de l'utilisateur
async function loadUserFavorites() {
    try {
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        if (!token) return;

        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            userFavorites.clear();
            data.data.forEach(favorite => {
                userFavorites.add(favorite.symbol);
            });
        }
    } catch (error) {
        console.error('Erreur chargement favoris:', error);
    }
}

// Ajouter un bouton favori à une carte d'action
function addFavoriteButton(cardElement, symbol, companyName) {
    // Vérifier si le bouton existe déjà
    if (cardElement.querySelector('.favorite-btn')) {
        return;
    }

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'favorite-btn';
    favoriteBtn.title = 'Ajouter aux favoris';
    
    // Vérifier si c'est déjà en favoris
    const isFavorited = userFavorites.has(symbol);
    updateFavoriteButtonState(favoriteBtn, isFavorited);
    
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Empêcher la propagation vers la carte
        toggleFavorite(symbol, companyName, favoriteBtn);
    });
    
    cardElement.style.position = 'relative';
    cardElement.appendChild(favoriteBtn);
}

// Mettre à jour l'état du bouton favori
function updateFavoriteButtonState(button, isFavorited) {
    if (isFavorited) {
        button.classList.add('favorited');
        button.innerHTML = '⭐';
        button.title = 'Supprimer des favoris';
    } else {
        button.classList.remove('favorited');
        button.innerHTML = '☆';
        button.title = 'Ajouter aux favoris';
    }
}

// Basculer l'état favori d'une action
async function toggleFavorite(symbol, companyName, buttonElement) {
    try {
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        if (!token) {
            showToast('Vous devez être connecté pour gérer vos favoris', 'error');
            return;
        }

        // Afficher le loading
        buttonElement.classList.add('loading');
        buttonElement.innerHTML = '<div class="spinner"></div>';
        
        const isFavorited = userFavorites.has(symbol);
        
        if (isFavorited) {
            // Supprimer des favoris
            const response = await fetch(`/api/favorites/${symbol}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                userFavorites.delete(symbol);
                updateFavoriteButtonState(buttonElement, false);
                showToast(`${symbol} supprimé des favoris`, 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la suppression');
            }
        } else {
            // Ajouter aux favoris
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    symbol: symbol,
                    company_name: companyName
                })
            });
            
            if (response.ok) {
                userFavorites.add(symbol);
                updateFavoriteButtonState(buttonElement, true);
                showToast(`${symbol} ajouté aux favoris`, 'success');
            } else {
                const errorData = await response.json();
                
                if (errorData.premium_required) {
                    showPremiumRequiredDialog();
                } else {
                    throw new Error(errorData.error || 'Erreur lors de l\'ajout');
                }
            }
        }
        
    } catch (error) {
        console.error('Erreur toggle favori:', error);
        showToast(error.message || 'Erreur lors de l\'opération', 'error');
        
        // Restaurer l'état du bouton
        const isFavorited = userFavorites.has(symbol);
        updateFavoriteButtonState(buttonElement, isFavorited);
    } finally {
        buttonElement.classList.remove('loading');
    }
}

// Afficher une notification toast
function showToast(message, type = 'success') {
    // Supprimer les toasts existants
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Afficher le toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Masquer le toast après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Afficher la boîte de dialogue Premium requis
function showPremiumRequiredDialog() {
    const message = `
        Limite de favoris atteinte !
        
        Vous avez atteint la limite de 5 favoris pour les comptes gratuits.
        
        Passez à Premium pour :
        • Favoris illimités
        • Alertes de prix (bientôt)
        • Analyses avancées (bientôt)
        
        Souhaitez-vous accéder à votre compte pour plus d'informations ?
    `;
    
    if (confirm(message)) {
        window.location.href = 'account.html';
    }
}

// Observer pour détecter les nouvelles cartes d'actions
const cardObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Chercher les cartes d'actions dans le noeud ajouté
                const cards = node.querySelectorAll ? 
                    node.querySelectorAll('.stock-card, .result-card') : 
                    [];
                
                // Si le noeud lui-même est une carte
                if (node.classList && (node.classList.contains('stock-card') || node.classList.contains('result-card'))) {
                    processStockCard(node);
                }
                
                // Traiter les cartes trouvées
                cards.forEach(processStockCard);
            }
        });
    });
});

// Traiter une carte d'action pour ajouter le bouton favori
function processStockCard(card) {
    // Extraire les informations de la carte
    const symbolElement = card.querySelector('.stock-symbol, .symbol, h3');
    const companyElement = card.querySelector('.stock-name, .company-name, .description');
    
    if (symbolElement) {
        const symbol = symbolElement.textContent.trim();
        const companyName = companyElement ? companyElement.textContent.trim() : symbol;
        
        // Ajouter le bouton favori
        addFavoriteButton(card, symbol, companyName);
    }
}

// Démarrer l'observation des changements dans le DOM
function startCardObservation() {
    const resultsContainer = document.getElementById('results');
    if (resultsContainer) {
        cardObserver.observe(resultsContainer, {
            childList: true,
            subtree: true
        });
        
        // Traiter les cartes déjà présentes
        const existingCards = resultsContainer.querySelectorAll('.stock-card, .result-card');
        existingCards.forEach(processStockCard);
    }
}

// Fonction globale pour être appelée depuis d'autres scripts
window.addFavoriteButton = addFavoriteButton;
window.initFavorites = initFavorites;

// Initialiser l'observation au chargement
document.addEventListener('DOMContentLoaded', () => {
    startCardObservation();
});

