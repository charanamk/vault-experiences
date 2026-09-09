(function (window, document) {
    "use strict";

    const STORAGE_KEY = "vault-theme";
    const AVAILABLE_THEMES = ["light", "dark"];

    function getSystemTheme() {
        try {
            if (window.matchMedia && typeof window.matchMedia === "function") {
                return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            }
        } catch (error) {
            console.warn("VAULT THEME: Unable to read the system theme preference.", error);
        }

        return "light";
    }

    function getStoredTheme() {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            return AVAILABLE_THEMES.includes(stored) ? stored : null;
        } catch (error) {
            return null;
        }
    }

    function applyTheme(theme, persist = false) {
        const normalizedTheme = AVAILABLE_THEMES.includes(theme) ? theme : "light";
        document.documentElement.setAttribute("data-theme", normalizedTheme);

        if (persist) {
            try {
                window.localStorage.setItem(STORAGE_KEY, normalizedTheme);
            } catch (error) {
                console.warn("VAULT THEME: Unable to persist the selected theme.", error);
            }
        }
    }

    function init() {
        const storedTheme = getStoredTheme();
        const preferredTheme = storedTheme || "dark";
        applyTheme(preferredTheme, Boolean(storedTheme));
    }

    window.VAULT_THEME = {
        STORAGE_KEY: STORAGE_KEY,
        getSystemTheme: getSystemTheme,
        getCurrentTheme: function () {
            return document.documentElement.getAttribute("data-theme") || "light";
        },
        setTheme: function (theme) {
            applyTheme(theme, true);
            return window.VAULT_THEME.getCurrentTheme();
        },
        init: init,
        resetToSystem: function () {
            applyTheme(getSystemTheme(), false);
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
                console.warn("VAULT THEME: Unable to clear the stored theme preference.", error);
            }
        }
    };

    init();
})(window, document);

