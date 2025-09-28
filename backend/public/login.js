let supabaseClient = null;

// Fonction d'initialisation de Supabase
function initSupabase() {
    return supabase.createClient(
        'NEXT_PUBLIC_SUPABASE_URL',
        '<NEXT_PUBLIC_SUPABASE_ANON_KEY>'
    );
}

// Éléments du DOM
const form = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");
const submitBtn = document.getElementById("submit-btn");

// Initialisation
async function init() {
    try {
        supabaseClient = await initSupabase();
        
        // Vérifier si l'utilisateur est déjà connecté
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            window.location.href = "index.html";
            return;
        }
        
    } catch (error) {
        showError("Service temporairement indisponible");
    }
}

// Gestion de la soumission
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!supabaseClient) {
        showError("Service non disponible");
        return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showError("Veuillez remplir tous les champs");
        return;
    }

    setLoading(true);
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Connexion réussie
        window.location.href = "index.html";
        
    } catch (error) {
        console.error("Erreur connexion:", error);
        
        let message = "Erreur de connexion";
        if (error.message.includes("Invalid login credentials")) {
            message = "Email ou mot de passe incorrect";
        } else if (error.message.includes("Email not confirmed")) {
            message = "Veuillez confirmer votre email avant de vous connecter";
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
