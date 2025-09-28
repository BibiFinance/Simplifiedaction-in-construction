let supabaseClient = null;

// Éléments du DOM
const form = document.getElementById("signupForm");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const submitBtn = document.getElementById("submitBtn");

// Initialisation
async function init() {
    try {
        supabaseClient = await initSupabase();
    } catch (error) {
        showError("Service temporairement indisponible");
    }
}

// Validation simple
function validateForm(formData) {
    if (!formData.firstName || formData.firstName.length < 2) {
        return "Le prénom doit contenir au moins 2 caractères";
    }
    if (!formData.lastName || formData.lastName.length < 2) {
        return "Le nom doit contenir au moins 2 caractères";
    }
    if (!formData.email || !/^[^
\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        return "Veuillez saisir une adresse email valide";
    }
    if (!formData.password || formData.password.length < 6) {
        return "Le mot de passe doit contenir au moins 6 caractères";
    }
    if (formData.password !== formData.confirmPassword) {
        return "Les mots de passe ne correspondent pas";
    }
    return null;
}

// Gestion de la soumission
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!supabaseClient) {
        showError("Service non disponible");
        return;
    }

    // Récupération des données
    const formData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        password: document.getElementById("password").value,
        confirmPassword: document.getElementById("confirmPassword").value
    };

    // Validation
    const validationError = validateForm(formData);
    if (validationError) {
        showError(validationError);
        return;
    }

    setLoading(true);

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    full_name: `${formData.firstName} ${formData.lastName}`
                }
            }
        });

        if (error) {
            throw error;
        }

        showSuccess("Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.");
        form.reset();
        
        setTimeout(() => {
            window.location.href = "login.html";
        }, 3000);

    } catch (error) {
        console.error("Erreur inscription:", error);
        
        let message = "Erreur lors de la création du compte";
        if (error.message.includes("already registered")) {
            message = "Cette adresse email est déjà utilisée";
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
    successMessage.style.display = "none";
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
    errorMessage.style.display = "none";
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Création..." : "Créer mon compte";
}

// Initialisation
document.addEventListener("DOMContentLoaded", init);