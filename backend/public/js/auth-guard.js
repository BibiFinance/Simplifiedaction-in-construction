// Protection des pages nécessitant une authentification
async function checkAuth() {
    try {
        const supabaseClient = await initSupabase();
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // C'est le changement clé : on renvoie l'objet utilisateur ou null, sans rediriger ici.
        return user || null;
    } catch (error) {
        console.error('Erreur vérification auth:', error);
        // On renvoie null en cas d'erreur
        return null;
    }
}

// Fonction de déconnexion (pas de changement)
async function logout() {
    try {
        const supabaseClient = await initSupabase();
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erreur déconnexion:', error);
    }
}

// Export global (pas de changement)
window.checkAuth = checkAuth;
window.logout = logout;