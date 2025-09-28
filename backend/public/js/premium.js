// premium.js - Gestion des fonctionnalités Premium
let premiumFeatures = {
    unlimitedFavorites: false,
    priceAlerts: false,
    advancedAnalytics: false,
    extendedHistory: false
};

// Vérifier le statut Premium de l'utilisateur
async function checkPremiumStatus() {
    try {
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        if (!token) return false;

        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const isPremium = data.data.is_premium;
            
            // Mettre à jour les fonctionnalités disponibles
            if (isPremium) {
                premiumFeatures = {
                    unlimitedFavorites: true,
                    priceAlerts: true,
                    advancedAnalytics: true,
                    extendedHistory: true
                };
            }
            
            return isPremium;
        }
        
        return false;
    } catch (error) {
        console.error('Erreur vérification Premium:', error);
        return false;
    }
}

// Simuler l'activation Premium (pour démonstration)
async function activatePremium() {
    try {
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        if (!token) {
            throw new Error('Utilisateur non connecté');
        }

        // Simuler un appel API pour activer Premium
        // Dans un vrai système, ceci serait géré par un processus de paiement
        const response = await fetch('/api/user/upgrade-premium', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan: 'premium_monthly'
            })
        });
        
        if (response.ok) {
            // Recharger le profil utilisateur
            await loadUserProfile();
            await checkPremiumStatus();
            
            showToast('Félicitations ! Vous êtes maintenant Premium !', 'success');
            
            // Recharger la page pour appliquer les changements
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            return true;
        } else {
            throw new Error('Erreur lors de l\'activation Premium');
        }
        
    } catch (error) {
        console.error('Erreur activation Premium:', error);
        showToast('Erreur lors de l\'activation Premium', 'error');
        return false;
    }
}

// Vérifier si une fonctionnalité est disponible
function isFeatureAvailable(feature) {
    return premiumFeatures[feature] || false;
}

// Afficher une boîte de dialogue pour les fonctionnalités Premium
function showPremiumFeatureDialog(featureName, description) {
    const message = `
        Fonctionnalité Premium : ${featureName}
        
        ${description}
        
        Cette fonctionnalité est réservée aux membres Premium.
        
        Avantages Premium :
        • Favoris illimités
        • Alertes de prix en temps réel
        • Analyses avancées
        • Historique étendu
        • Support prioritaire
        
        Souhaitez-vous découvrir Premium ?
    `;
    
    if (confirm(message)) {
        window.location.href = 'account.html';
    }
}

// Ajouter des badges Premium aux fonctionnalités
function addPremiumBadges() {
    // Ajouter des badges aux éléments qui nécessitent Premium
    const premiumElements = document.querySelectorAll('[data-premium="true"]');
    
    premiumElements.forEach(element => {
        if (!element.querySelector('.premium-badge')) {
            const badge = document.createElement('span');
            badge.className = 'premium-badge';
            badge.textContent = 'PRO';
            badge.title = 'Fonctionnalité Premium';
            
            element.style.position = 'relative';
            element.appendChild(badge);
            
            // Ajouter un gestionnaire de clic pour les non-Premium
            element.addEventListener('click', async (e) => {
                const isPremium = await checkPremiumStatus();
                if (!isPremium) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const featureName = element.getAttribute('data-premium-feature') || 'Fonctionnalité avancée';
                    const description = element.getAttribute('data-premium-description') || 'Cette fonctionnalité nécessite un abonnement Premium.';
                    
                    showPremiumFeatureDialog(featureName, description);
                }
            });
        }
    });
}

// Initialiser les fonctionnalités Premium
async function initPremium() {
    await checkPremiumStatus();
    addPremiumBadges();
    
    // Ajouter des gestionnaires pour les boutons d'upgrade
    const upgradeButtons = document.querySelectorAll('.upgrade-btn, [data-action="upgrade"]');
    upgradeButtons.forEach(button => {
        button.addEventListener('click', () => {
            showPremiumUpgradeDialog();
        });
    });
}

// Afficher la boîte de dialogue d'upgrade Premium
function showPremiumUpgradeDialog() {
    const message = `
        🌟 Passez à Simplified Action Premium ! 🌟
        
        Fonctionnalités incluses :
        ✅ Favoris illimités
        ✅ Alertes de prix en temps réel
        ✅ Analyses techniques avancées
        ✅ Historique étendu (1 an)
        ✅ Support prioritaire
        ✅ Nouvelles fonctionnalités en avant-première
        
        Prix : 9,99€/mois
        
        Note : Ceci est une démonstration. 
        Dans un vrai système, vous seriez redirigé vers une page de paiement sécurisée.
        
        Voulez-vous activer Premium pour cette démonstration ?
    `;
    
    if (confirm(message)) {
        activatePremium();
    }
}

// Fonctions utilitaires pour les limites
function canAddMoreFavorites(currentCount) {
    if (premiumFeatures.unlimitedFavorites) {
        return true;
    }
    return currentCount < 5; // Limite gratuite
}

function getFavoritesLimit() {
    return premiumFeatures.unlimitedFavorites ? Infinity : 5;
}

// Exporter les fonctions pour utilisation globale
window.checkPremiumStatus = checkPremiumStatus;
window.isFeatureAvailable = isFeatureAvailable;
window.showPremiumFeatureDialog = showPremiumFeatureDialog;
window.canAddMoreFavorites = canAddMoreFavorites;
window.getFavoritesLimit = getFavoritesLimit;
window.initPremium = initPremium;
window.activatePremium = activatePremium;

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', initPremium);

