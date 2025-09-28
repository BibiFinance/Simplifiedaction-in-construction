// account.js - Gestion de la page compte utilisateur
let supabaseClient = null;
let userProfile = null;
let userStats = null;

// Éléments du DOM
const loadingSection = document.getElementById('loading');
const accountContent = document.getElementById('account-content');
const messageDiv = document.getElementById('message');

// Éléments du profil
const firstNameDisplay = document.getElementById('first-name-display');
const lastNameDisplay = document.getElementById('last-name-display');
const emailDisplay = document.getElementById('email-display');
const firstNameInput = document.getElementById('first-name-input');
const lastNameInput = document.getElementById('last-name-input');
const editProfileBtn = document.getElementById('edit-profile-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const profileActions = document.getElementById('profile-actions');

// Éléments du statut
const statusCard = document.getElementById('status-card');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const statusDescription = document.getElementById('status-description');
const statusLimits = document.getElementById('status-limits');
const upgradeBtn = document.getElementById('upgrade-btn');

// Éléments des statistiques
const favoritesCountEl = document.getElementById('favorites-count');
const memberSinceEl = document.getElementById('member-since');

// Éléments des favoris
const favoritesContainer = document.getElementById('favorites-container');
const favoritesLoading = document.getElementById('favorites-loading');
const favoritesEmpty = document.getElementById('favorites-empty');
const favoritesList = document.getElementById('favorites-list');
const refreshFavoritesBtn = document.getElementById('refresh-favorites-btn');

// Initialisation
async function init() {
    try {
        // Vérifier l'authentification
        const user = await checkAuth();
        if (!user) return;

        // Initialiser Supabase
        supabaseClient = await initSupabase();
        
        // Charger les données utilisateur
        await loadUserData();
        
        // Afficher le contenu
        loadingSection.style.display = 'none';
        accountContent.style.display = 'block';
        
    } catch (error) {
        console.error('Erreur initialisation:', error);
        showMessage('Erreur lors du chargement de la page', 'error');
        loadingSection.style.display = 'none';
    }
}

// Charger les données utilisateur
async function loadUserData() {
    try {
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        if (!token) {
            throw new Error('Token non disponible');
        }

        // Charger le profil
        const profileResponse = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!profileResponse.ok) {
            throw new Error('Erreur lors du chargement du profil');
        }
        
        const profileData = await profileResponse.json();
        userProfile = profileData.data;
        
        // Charger les statistiques
        const statsResponse = await fetch('/api/user/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!statsResponse.ok) {
            throw new Error('Erreur lors du chargement des statistiques');
        }
        
        const statsData = await statsResponse.json();
        userStats = statsData.data;
        
        // Mettre à jour l'affichage
        updateProfileDisplay();
        updateStatusDisplay();
        updateStatsDisplay();
        
        // Charger les favoris
        await loadFavorites();
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        showMessage('Erreur lors du chargement des données utilisateur', 'error');
    }
}

// Mettre à jour l'affichage du profil
function updateProfileDisplay() {
    firstNameDisplay.textContent = userProfile.first_name || 'Non renseigné';
    lastNameDisplay.textContent = userProfile.last_name || 'Non renseigné';
    emailDisplay.textContent = userProfile.email || 'Non renseigné';
    
    firstNameInput.value = userProfile.first_name || '';
    lastNameInput.value = userProfile.last_name || '';
}

// Mettre à jour l'affichage du statut
function updateStatusDisplay() {
    const isPremium = userProfile.is_premium;
    
    if (isPremium) {
        statusCard.classList.add('premium');
        statusBadge.classList.remove('free');
        statusBadge.classList.add('premium');
        statusText.textContent = 'Premium';
        statusDescription.textContent = 'Accès à toutes les fonctionnalités';
        statusLimits.textContent = 'Favoris illimités';
        upgradeBtn.style.display = 'none';
    } else {
        statusCard.classList.remove('premium');
        statusBadge.classList.add('free');
        statusBadge.classList.remove('premium');
        statusText.textContent = 'Gratuit';
        statusDescription.textContent = 'Accès aux fonctionnalités de base';
        statusLimits.textContent = 'Limite : 5 favoris';
        upgradeBtn.style.display = 'block';
    }
}

// Mettre à jour l'affichage des statistiques
function updateStatsDisplay() {
    favoritesCountEl.textContent = userStats.favorites_count;
    
    const memberSince = new Date(userStats.member_since);
    const now = new Date();
    const diffTime = Math.abs(now - memberSince);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
        memberSinceEl.textContent = `${diffDays}j`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        memberSinceEl.textContent = `${months}m`;
    } else {
        const years = Math.floor(diffDays / 365);
        memberSinceEl.textContent = `${years}a`;
    }
}

// Charger les favoris
async function loadFavorites() {
    try {
        favoritesLoading.style.display = 'block';
        favoritesEmpty.style.display = 'none';
        favoritesList.innerHTML = '';
        
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des favoris');
        }
        
        const data = await response.json();
        const favorites = data.data;
        
        favoritesLoading.style.display = 'none';
        
        if (favorites.length === 0) {
            favoritesEmpty.style.display = 'block';
        } else {
            displayFavorites(favorites);
        }
        
    } catch (error) {
        console.error('Erreur chargement favoris:', error);
        favoritesLoading.style.display = 'none';
        showMessage('Erreur lors du chargement des favoris', 'error');
    }
}

// Afficher les favoris
function displayFavorites(favorites) {
    favoritesList.innerHTML = '';
    
    favorites.forEach(favorite => {
        const favoriteEl = document.createElement('div');
        favoriteEl.className = 'favorite-item';
        
        const addedDate = new Date(favorite.added_at).toLocaleDateString('fr-FR');
        
        favoriteEl.innerHTML = `
            <div class="favorite-header">
                <div class="favorite-symbol">${favorite.symbol}</div>
                <button class="favorite-remove" onclick="removeFavorite('${favorite.symbol}')" title="Supprimer">
                    ×
                </button>
            </div>
            <div class="favorite-company">${favorite.company_name}</div>
            <div class="favorite-date">Ajouté le ${addedDate}</div>
        `;
        
        favoritesList.appendChild(favoriteEl);
    });
}

// Supprimer un favori
async function removeFavorite(symbol) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${symbol} de vos favoris ?`)) {
        return;
    }
    
    try {
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        const response = await fetch(`/api/favorites/${symbol}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la suppression');
        }
        
        showMessage('Favori supprimé avec succès', 'success');
        
        // Recharger les favoris et les stats
        await loadFavorites();
        await loadUserData();
        
    } catch (error) {
        console.error('Erreur suppression favori:', error);
        showMessage('Erreur lors de la suppression du favori', 'error');
    }
}

// Gestion de l'édition du profil
function toggleProfileEdit() {
    const isEditing = firstNameInput.style.display !== 'none';
    
    if (isEditing) {
        // Annuler l'édition
        firstNameDisplay.style.display = 'block';
        lastNameDisplay.style.display = 'block';
        firstNameInput.style.display = 'none';
        lastNameInput.style.display = 'none';
        profileActions.style.display = 'none';
        editProfileBtn.textContent = 'Modifier';
        
        // Restaurer les valeurs originales
        firstNameInput.value = userProfile.first_name || '';
        lastNameInput.value = userProfile.last_name || '';
    } else {
        // Activer l'édition
        firstNameDisplay.style.display = 'none';
        lastNameDisplay.style.display = 'none';
        firstNameInput.style.display = 'block';
        lastNameInput.style.display = 'block';
        profileActions.style.display = 'flex';
        editProfileBtn.textContent = 'Annuler';
        firstNameInput.focus();
    }
}

// Sauvegarder le profil
async function saveProfile() {
    try {
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        
        if (!firstName || !lastName) {
            showMessage('Veuillez remplir tous les champs', 'error');
            return;
        }
        
        const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
        
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName
            })
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la sauvegarde');
        }
        
        const data = await response.json();
        userProfile = data.data;
        
        updateProfileDisplay();
        toggleProfileEdit();
        showMessage('Profil mis à jour avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur sauvegarde profil:', error);
        showMessage('Erreur lors de la sauvegarde du profil', 'error');
    }
}

// Afficher un message
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Gestionnaires d'événements
editProfileBtn.addEventListener('click', toggleProfileEdit);
saveProfileBtn.addEventListener('click', saveProfile);
cancelProfileBtn.addEventListener('click', toggleProfileEdit);
refreshFavoritesBtn.addEventListener('click', loadFavorites);

upgradeBtn.addEventListener('click', () => {
    alert('Fonctionnalité Premium à venir ! Restez connecté pour plus d\'informations.');
});

// Fonction globale pour supprimer un favori (appelée depuis le HTML)
window.removeFavorite = removeFavorite;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', init);