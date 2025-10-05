/**
 * Module de gestion des favoris - Version refactorisée sans Supabase
 * Utilise les nouvelles API Express/PostgreSQL
 */

class FavoritesManager {
    constructor() {
        this.userFavorites = new Set();
        this.userProfile = null;
        this.isInitialized = false;
    }

    /**
     * Initialise le gestionnaire de favoris
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Vérifier si l'utilisateur est connecté
            if (!authManager.isAuthenticated()) {
                this.isInitialized = true;
                return;
            }

            await this.loadUserProfile();
            await this.loadUserFavorites();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erreur initialisation favoris:', error);
            this.isInitialized = true;
        }
    }

    /**
     * Charge le profil utilisateur
     */
    async loadUserProfile() {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.userProfile = data.data;
                
                // Mettre à jour les informations utilisateur dans authManager
                authManager.updateCurrentUser({
                    firstName: data.data.first_name,
                    lastName: data.data.last_name,
                    isPremium: data.data.is_premium
                });
            }
        } catch (error) {
            console.error('Erreur chargement profil:', error);
        }
    }

    /**
     * Charge les favoris de l'utilisateur
     */
    async loadUserFavorites() {
        try {
            const response = await fetch('/api/favorites', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.userFavorites.clear();
                data.data.forEach(favorite => {
                    this.userFavorites.add(favorite.symbol);
                });
            }
        } catch (error) {
            console.error('Erreur chargement favoris:', error);
        }
    }

    /**
     * Ajoute un favori
     */
    async addFavorite(symbol, companyName) {
        try {
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    symbol: symbol,
                    company_name: companyName
                })
            });

            const data = await response.json();

            if (data.success) {
                this.userFavorites.add(symbol);
                return { success: true, data: data.data };
            } else {
                return { 
                    success: false, 
                    error: data.error,
                    premium_required: data.premium_required 
                };
            }
        } catch (error) {
            console.error('Erreur ajout favori:', error);
            return { success: false, error: 'Erreur de connexion' };
        }
    }

    /**
     * Supprime un favori
     */
    async removeFavorite(symbol) {
        try {
            const response = await fetch(`/api/favorites/${symbol}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                this.userFavorites.delete(symbol);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Erreur suppression favori:', error);
            return { success: false, error: 'Erreur de connexion' };
        }
    }

    /**
     * Vérifie si un symbole est en favoris
     */
    isFavorite(symbol) {
        return this.userFavorites.has(symbol);
    }

    /**
     * Récupère tous les favoris
     */
    async getFavorites() {
        try {
            const response = await fetch('/api/favorites', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, data: data.data };
            } else {
                const data = await response.json();
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Erreur récupération favoris:', error);
            return { success: false, error: 'Erreur de connexion' };
        }
    }

    /**
     * Récupère les statistiques des favoris
     */
    async getStats() {
        try {
            const response = await fetch('/api/favorites/stats', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, data: data.data };
            } else {
                const data = await response.json();
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Erreur récupération stats favoris:', error);
            return { success: false, error: 'Erreur de connexion' };
        }
    }
}

// Instance globale du gestionnaire de favoris
const favoritesManager = new FavoritesManager();

/**
 * Ajoute un bouton favori à une carte d'action
 */
function addFavoriteButton(cardElement, symbol, companyName) {
    // Vérifier si l'utilisateur est connecté
    if (!authManager.isAuthenticated()) {
        return;
    }

    // Vérifier si le bouton existe déjà
    if (cardElement.querySelector('.favorite-btn')) {
        return;
    }

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'favorite-btn';
    favoriteBtn.title = 'Ajouter aux favoris';
    
    // Vérifier si c'est déjà en favoris
    const isFavorited = favoritesManager.isFavorite(symbol);
    updateFavoriteButtonState(favoriteBtn, isFavorited);
    
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(symbol, companyName, favoriteBtn);
    });
    
    cardElement.style.position = 'relative';
    cardElement.appendChild(favoriteBtn);
}

/**
 * Met à jour l'état du bouton favori
 */
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

/**
 * Bascule l'état favori d'une action
 */
async function toggleFavorite(symbol, companyName, buttonElement) {
    try {
        if (!authManager.isAuthenticated()) {
            showToast('Vous devez être connecté pour gérer vos favoris', 'error');
            return;
        }

        // Afficher le loading
        buttonElement.classList.add('loading');
        buttonElement.innerHTML = '<div class="spinner"></div>';
        
        const isFavorited = favoritesManager.isFavorite(symbol);
        
        if (isFavorited) {
            // Supprimer des favoris
            const result = await favoritesManager.removeFavorite(symbol);
            
            if (result.success) {
                updateFavoriteButtonState(buttonElement, false);
                showToast(`${symbol} supprimé des favoris`, 'success');
            } else {
                throw new Error(result.error || 'Erreur lors de la suppression');
            }
        } else {
            // Ajouter aux favoris
            const result = await favoritesManager.addFavorite(symbol, companyName);
            
            if (result.success) {
                updateFavoriteButtonState(buttonElement, true);
                showToast(`${symbol} ajouté aux favoris`, 'success');
            } else {
                if (result.premium_required) {
                    showPremiumRequiredDialog();
                } else {
                    throw new Error(result.error || 'Erreur lors de l\'ajout');
                }
            }
        }
        
    } catch (error) {
        console.error('Erreur toggle favori:', error);
        showToast(error.message || 'Erreur lors de l\'opération', 'error');
        
        // Restaurer l'état du bouton
        const isFavorited = favoritesManager.isFavorite(symbol);
        updateFavoriteButtonState(buttonElement, isFavorited);
    } finally {
        buttonElement.classList.remove('loading');
    }
}

/**
 * Affiche une notification toast
 */
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

/**
 * Affiche la boîte de dialogue Premium requis
 */
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

/**
 * Observer pour détecter les nouvelles cartes d'actions
 */
const cardObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Chercher les cartes d'actions dans le noeud ajouté
                const cards = node.querySelectorAll ? 
                    node.querySelectorAll('.stock-card, .result-card, .card') : 
                    [];
                
                // Si le noeud lui-même est une carte
                if (node.classList && (node.classList.contains('stock-card') || node.classList.contains('result-card') || node.classList.contains('card'))) {
                    processStockCard(node);
                }
                
                // Traiter les cartes trouvées
                cards.forEach(processStockCard);
            }
        });
    });
});

/**
 * Traite une carte d'action pour ajouter le bouton favori
 */
function processStockCard(card) {
    // Extraire les informations de la carte
    const symbolElement = card.querySelector('.stock-symbol, .symbol, h3, .card-title');
    const companyElement = card.querySelector('.stock-name, .company-name, .description, .small-desc');
    
    if (symbolElement) {
        let symbol = symbolElement.textContent.trim();
        
        // Pour les cartes de la liste S&P 500, le symbole peut être dans un attribut data
        if (card.dataset && card.dataset.symbol) {
            symbol = card.dataset.symbol;
        }
        
        const companyName = companyElement ? companyElement.textContent.trim() : symbol;
        
        // Ajouter le bouton favori
        addFavoriteButton(card, symbol, companyName);
    }
}

/**
 * Démarre l'observation des changements dans le DOM
 */
function startCardObservation() {
    const containers = [
        document.getElementById('results'),
        document.getElementById('actionsList'),
        document.querySelector('.actions-grid')
    ].filter(Boolean);

    containers.forEach(container => {
        cardObserver.observe(container, {
            childList: true,
            subtree: true
        });
        
        // Traiter les cartes déjà présentes
        const existingCards = container.querySelectorAll('.stock-card, .result-card, .card');
        existingCards.forEach(processStockCard);
    });
}

// Exports globaux
window.favoritesManager = favoritesManager;
window.addFavoriteButton = addFavoriteButton;
window.toggleFavorite = toggleFavorite;
window.showToast = showToast;

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Attendre que l'authentification soit initialisée
    await authManager.init();
    
    // Initialiser les favoris si l'utilisateur est connecté
    if (authManager.isAuthenticated()) {
        await favoritesManager.init();
    }
    
    // Démarrer l'observation des cartes
    startCardObservation();
});
