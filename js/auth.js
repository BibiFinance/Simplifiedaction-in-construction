/**
 * Module d'authentification - Remplace Supabase
 * Gère l'authentification via les nouvelles API Express/PostgreSQL
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * Initialise le gestionnaire d'authentification
     */
    async init() {
        if (this.isInitialized) return this.currentUser;

        try {
            // Vérifier si l'utilisateur est déjà connecté
            const response = await fetch('/api/auth/status', {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success && data.authenticated) {
                this.currentUser = data.data.user;
            } else {
                this.currentUser = null;
            }

            this.isInitialized = true;
            return this.currentUser;
        } catch (error) {
            console.error('Erreur initialisation auth:', error);
            this.currentUser = null;
            this.isInitialized = true;
            return null;
        }
    }

    /**
     * Inscription d'un nouvel utilisateur
     */
    async signUp(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: userData.email,
                    password: userData.password,
                    confirmPassword: userData.confirmPassword,
                    firstName: userData.firstName,
                    lastName: userData.lastName
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.data.user;
                return { data: { user: this.currentUser }, error: null };
            } else {
                return { data: null, error: { message: data.error } };
            }
        } catch (error) {
            console.error('Erreur inscription:', error);
            return { data: null, error: { message: 'Erreur de connexion' } };
        }
    }

    /**
     * Connexion d'un utilisateur
     */
    async signInWithPassword(credentials) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: credentials.email,
                    password: credentials.password
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.data.user;
                return { data: { user: this.currentUser }, error: null };
            } else {
                return { data: null, error: { message: data.error } };
            }
        } catch (error) {
            console.error('Erreur connexion:', error);
            return { data: null, error: { message: 'Erreur de connexion' } };
        }
    }

    /**
     * Déconnexion de l'utilisateur
     */
    async signOut() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = null;
                return { error: null };
            } else {
                return { error: { message: data.error } };
            }
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            // Même en cas d'erreur, on considère l'utilisateur comme déconnecté côté client
            this.currentUser = null;
            return { error: null };
        }
    }

    /**
     * Récupère l'utilisateur actuel
     */
    async getUser() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.currentUser) {
            return { data: { user: this.currentUser }, error: null };
        } else {
            return { data: { user: null }, error: null };
        }
    }

    /**
     * Récupère la session actuelle
     */
    async getSession() {
        const userResult = await this.getUser();
        
        if (userResult.data.user) {
            return {
                data: {
                    session: {
                        user: userResult.data.user,
                        access_token: 'managed_by_cookie' // Token géré par cookie httpOnly
                    }
                },
                error: null
            };
        } else {
            return {
                data: { session: null },
                error: null
            };
        }
    }

    /**
     * Vérifie si l'utilisateur est connecté
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Récupère les informations utilisateur actuelles
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Met à jour les informations utilisateur en cache
     */
    updateCurrentUser(userData) {
        if (this.currentUser) {
            this.currentUser = { ...this.currentUser, ...userData };
        }
    }
}

// Instance globale du gestionnaire d'authentification
const authManager = new AuthManager();

// Fonctions compatibles avec l'ancienne API Supabase
const auth = {
    signUp: (userData) => authManager.signUp(userData),
    signInWithPassword: (credentials) => authManager.signInWithPassword(credentials),
    signOut: () => authManager.signOut(),
    getUser: () => authManager.getUser(),
    getSession: () => authManager.getSession()
};

// Client compatible avec l'ancienne API Supabase
const supabaseClient = {
    auth: auth
};

// Fonction d'initialisation compatible
async function initSupabase() {
    await authManager.init();
    return supabaseClient;
}

// Exports globaux pour compatibilité
window.authManager = authManager;
window.supabaseClient = supabaseClient;
window.initSupabase = initSupabase;

// Auto-initialisation
document.addEventListener('DOMContentLoaded', () => {
    authManager.init();
});
