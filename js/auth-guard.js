/**
 * Module de protection des pages - Version refactorisée sans Supabase
 * Utilise le nouveau système d'authentification
 */

/**
 * Vérifie l'authentification de l'utilisateur
 * @returns {Object|null} Utilisateur connecté ou null
 */
async function checkAuth() {
    try {
        // S'assurer que authManager est initialisé
        if (!authManager.isInitialized) {
            await authManager.init();
        }

        // Retourner l'utilisateur actuel
        return authManager.getCurrentUser();
    } catch (error) {
        console.error('Erreur vérification auth:', error);
        return null;
    }
}

/**
 * Déconnecte l'utilisateur
 */
async function logout() {
    try {
        const result = await authManager.signOut();
        
        if (!result.error) {
            // Rediriger vers la page de connexion
            window.location.href = 'login.html';
        } else {
            console.error('Erreur déconnexion:', result.error);
            // Même en cas d'erreur, rediriger vers la page de connexion
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Erreur déconnexion:', error);
        // En cas d'erreur, rediriger quand même
        window.location.href = 'login.html';
    }
}

/**
 * Protège une page en redirigeant les utilisateurs non connectés
 * @param {string} redirectUrl - URL de redirection (par défaut: login.html)
 */
async function requireAuth(redirectUrl = 'login.html') {
    const user = await checkAuth();
    
    if (!user) {
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

/**
 * Redirige les utilisateurs connectés (pour les pages login/signup)
 * @param {string} redirectUrl - URL de redirection (par défaut: index.html)
 */
async function redirectIfAuthenticated(redirectUrl = 'index.html') {
    const user = await checkAuth();
    
    if (user) {
        window.location.href = redirectUrl;
        return true;
    }
    
    return false;
}

/**
 * Met à jour l'interface utilisateur selon l'état d'authentification
 */
async function updateAuthUI() {
    const user = await checkAuth();
    const authButtonsDiv = document.getElementById('auth-buttons');
    
    if (!authButtonsDiv) return;
    
    if (user) {
        authButtonsDiv.innerHTML = `
            <span class="user-info">Bonjour ${user.firstName || user.email}</span>
            <button class="buttonlogin" onclick="logout()">
                Déconnexion
            </button>
        `;
    } else {
        authButtonsDiv.innerHTML = `
            <button class="buttonlogin" onclick="window.location.href='login.html'">
                Se connecter
            </button>
        `;
    }
}

/**
 * Initialise la protection d'authentification pour la page courante
 */
async function initAuthGuard() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages qui nécessitent une authentification
    const protectedPages = ['account.html'];
    
    // Pages qui redirigent si l'utilisateur est déjà connecté
    const guestOnlyPages = ['login.html', 'signup.html'];
    
    if (protectedPages.includes(currentPage)) {
        const isAuthenticated = await requireAuth();
        if (!isAuthenticated) return;
    }
    
    if (guestOnlyPages.includes(currentPage)) {
        const wasRedirected = await redirectIfAuthenticated();
        if (wasRedirected) return;
    }
    
    // Mettre à jour l'interface utilisateur
    await updateAuthUI();
}

// Exports globaux pour compatibilité
window.checkAuth = checkAuth;
window.logout = logout;
window.requireAuth = requireAuth;
window.redirectIfAuthenticated = redirectIfAuthenticated;
window.updateAuthUI = updateAuthUI;
window.initAuthGuard = initAuthGuard;

// Auto-initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu pour s'assurer que authManager est chargé
    setTimeout(initAuthGuard, 100);
});
