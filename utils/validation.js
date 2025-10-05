/**
 * Utilitaires de validation pour les données utilisateur
 */

/**
 * Valide une adresse email
 * @param {string} email - Adresse email à valider
 * @returns {boolean} True si valide
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valide un mot de passe
 * @param {string} password - Mot de passe à valider
 * @returns {Object} Résultat de validation
 */
function validatePassword(password) {
    const result = {
        isValid: true,
        errors: []
    };

    if (!password) {
        result.isValid = false;
        result.errors.push('Le mot de passe est requis');
        return result;
    }

    if (password.length < 6) {
        result.isValid = false;
        result.errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (password.length > 128) {
        result.isValid = false;
        result.errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
    }

    // Vérifier qu'il contient au moins une lettre et un chiffre
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
        result.isValid = false;
        result.errors.push('Le mot de passe doit contenir au moins une lettre et un chiffre');
    }

    return result;
}

/**
 * Valide un nom (prénom ou nom de famille)
 * @param {string} name - Nom à valider
 * @param {string} fieldName - Nom du champ pour les erreurs
 * @returns {Object} Résultat de validation
 */
function validateName(name, fieldName = 'nom') {
    const result = {
        isValid: true,
        errors: []
    };

    if (!name || typeof name !== 'string') {
        result.isValid = false;
        result.errors.push(`Le ${fieldName} est requis`);
        return result;
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
        result.isValid = false;
        result.errors.push(`Le ${fieldName} doit contenir au moins 2 caractères`);
    }

    if (trimmedName.length > 50) {
        result.isValid = false;
        result.errors.push(`Le ${fieldName} ne peut pas dépasser 50 caractères`);
    }

    // Vérifier que le nom ne contient que des lettres, espaces, tirets et apostrophes
    if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(trimmedName)) {
        result.isValid = false;
        result.errors.push(`Le ${fieldName} ne peut contenir que des lettres, espaces, tirets et apostrophes`);
    }

    return result;
}

/**
 * Valide un symbole boursier
 * @param {string} symbol - Symbole à valider
 * @returns {Object} Résultat de validation
 */
function validateStockSymbol(symbol) {
    const result = {
        isValid: true,
        errors: []
    };

    if (!symbol || typeof symbol !== 'string') {
        result.isValid = false;
        result.errors.push('Le symbole est requis');
        return result;
    }

    const trimmedSymbol = symbol.trim().toUpperCase();

    if (trimmedSymbol.length < 1 || trimmedSymbol.length > 10) {
        result.isValid = false;
        result.errors.push('Le symbole doit contenir entre 1 et 10 caractères');
    }

    // Vérifier que le symbole ne contient que des lettres et des points
    if (!/^[A-Z.]+$/.test(trimmedSymbol)) {
        result.isValid = false;
        result.errors.push('Le symbole ne peut contenir que des lettres majuscules et des points');
    }

    return result;
}

/**
 * Valide les données d'inscription
 * @param {Object} data - Données à valider
 * @returns {Object} Résultat de validation
 */
function validateRegistrationData(data) {
    const result = {
        isValid: true,
        errors: []
    };

    // Valider l'email
    if (!data.email || !isValidEmail(data.email)) {
        result.isValid = false;
        result.errors.push('Adresse email invalide');
    }

    // Valider le mot de passe
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
        result.isValid = false;
        result.errors.push(...passwordValidation.errors);
    }

    // Valider la confirmation du mot de passe
    if (data.password !== data.confirmPassword) {
        result.isValid = false;
        result.errors.push('Les mots de passe ne correspondent pas');
    }

    // Valider le prénom
    const firstNameValidation = validateName(data.firstName, 'prénom');
    if (!firstNameValidation.isValid) {
        result.isValid = false;
        result.errors.push(...firstNameValidation.errors);
    }

    // Valider le nom
    const lastNameValidation = validateName(data.lastName, 'nom');
    if (!lastNameValidation.isValid) {
        result.isValid = false;
        result.errors.push(...lastNameValidation.errors);
    }

    return result;
}

/**
 * Valide les données de connexion
 * @param {Object} data - Données à valider
 * @returns {Object} Résultat de validation
 */
function validateLoginData(data) {
    const result = {
        isValid: true,
        errors: []
    };

    if (!data.email || !isValidEmail(data.email)) {
        result.isValid = false;
        result.errors.push('Adresse email invalide');
    }

    if (!data.password) {
        result.isValid = false;
        result.errors.push('Mot de passe requis');
    }

    return result;
}

/**
 * Nettoie et normalise une chaîne de caractères
 * @param {string} str - Chaîne à nettoyer
 * @returns {string} Chaîne nettoyée
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/\s+/g, ' ');
}

module.exports = {
    isValidEmail,
    validatePassword,
    validateName,
    validateStockSymbol,
    validateRegistrationData,
    validateLoginData,
    sanitizeString
};
