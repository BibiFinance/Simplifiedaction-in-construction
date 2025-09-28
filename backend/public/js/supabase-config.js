// Configuration centralisée de Supabase
let supabaseClient = null;

async function initSupabase() {
    if (supabaseClient) {
        return supabaseClient;
    }

    try {
        const response = await fetch("/api/supabase-config");
        const config = await response.json();
        
        if (!config.success) {
            throw new Error("Configuration Supabase non disponible");
        }

        const { createClient } = supabase;
        supabaseClient = createClient(config.url, config.key);
        
        console.log("✅ Supabase initialisé");
        return supabaseClient;
        
    } catch (error) {
        console.error("❌ Erreur initialisation Supabase:", error);
        throw error;
    }
}

// Export pour utilisation dans d'autres fichiers
window.initSupabase = initSupabase;