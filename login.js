/**
 * Gestion de la page de connexion - Version refactorisée
 * Utilise les nouvelles API Express/PostgreSQL au lieu de Supabase
 */

// Éléments du DOM
const form = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const submitBtn = document.getElementById("submit-btn");

// Initialisation
async function init() {
    try {
        // Vérifier si l'utilisateur est déjà connecté
        const user = await checkAuth();
        if (user) {
            window.location.href = "index.html";
            return;
        }
    } catch (error) {
        console.error("Erreur init:", error);
        showError("Service temporairement indisponible");
    }
}

// Gestion de la soumission
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showError("Veuillez remplir tous les champs");
        return;
    }

    setLoading(true);
    
    try {
        // Utiliser le nouveau système d'authentification
        const result = await authManager.signInWithPassword({
            email,
            password
        });

        if (result.error) {
            throw new Error(result.error.message);
        }

        console.log("✅ Connexion réussie:", result.data.user.email);
        
        // Connexion réussie
        window.location.href = "index.html";
        
    } catch (error) {
        console.error("❌ Erreur connexion:", error);
        
        let message = "Erreur de connexion";
        if (error.message.includes("Email ou mot de passe incorrect")) {
            message = "Email ou mot de passe incorrect";
        } else if (error.message.includes("Trop de tentatives")) {
            message = "Trop de tentatives de connexion. Réessayez plus tard.";
        } else if (error.message) {
            message = error.message;
        }
        
        showError(message);
    } finally {
        setLoading(false);
    }
});

// Fonctions utilitaires
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Connexion..." : "Se connecter";
}

// Initialisation au chargement
document.addEventListener("DOMContentLoaded", init);
