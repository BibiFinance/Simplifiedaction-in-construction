/**
 * Gestion de la page d'inscription - Version refactorisée
 * Utilise les nouvelles API Express/PostgreSQL au lieu de Supabase
 */

// Éléments du DOM
const form = document.getElementById("signupForm");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const submitBtn = document.getElementById("submitBtn");

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

// Validation simple côté client
function validateForm(formData) {
    if (!formData.firstName || formData.firstName.length < 2) {
        return "Le prénom doit contenir au moins 2 caractères";
    }
    if (!formData.lastName || formData.lastName.length < 2) {
        return "Le nom doit contenir au moins 2 caractères";
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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

    // Récupération des données
    const formData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        password: document.getElementById("password").value,
        confirmPassword: document.getElementById("confirmPassword").value
    };

    // Validation côté client
    const validationError = validateForm(formData);
    if (validationError) {
        showError(validationError);
        return;
    }

    setLoading(true);

    try {
        // Utiliser le nouveau système d'authentification
        const result = await authManager.signUp(formData);

        if (result.error) {
            throw new Error(result.error.message);
        }

        showSuccess("Compte créé avec succès ! Vous êtes maintenant connecté.");
        form.reset();
        
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);

    } catch (error) {
        console.error("Erreur inscription:", error);
        
        let message = "Erreur lors de la création du compte";
        if (error.message.includes("Cette adresse email est déjà utilisée")) {
            message = "Cette adresse email est déjà utilisée";
        } else if (error.message.includes("Trop de tentatives")) {
            message = "Trop de tentatives d'inscription. Réessayez plus tard.";
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
