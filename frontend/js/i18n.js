// Internationalization (i18n) Module

// Current language (default: en for English)
let currentLanguage = 'en';

// Translation dictionary
const translations = {};

// Track loaded translations
const loadedTranslations = new Set();

// Add translation for a language
function addTranslation(lang, translation) {
    translations[lang] = translation;
    loadedTranslations.add(lang);

    // If this is the last language to load, initialize
    if (loadedTranslations.size === 2) {
        initI18nInternal();
    }
}

// Initialization flag
let initialized = false;

// Initialize i18n (called after all translations are loaded)
function initI18nInternal() {
    if (initialized) return;
    initialized = true;

    // Load saved language from localStorage
    const savedLang = localStorage.getItem('language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
    }

    // Setup language switcher buttons - reload page on click
    const zhBtn = document.getElementById('langZh');
    const enBtn = document.getElementById('langEn');

    if (zhBtn) {
        zhBtn.addEventListener('click', () => switchLanguageAndReload('zh'));
    }
    if (enBtn) {
        enBtn.addEventListener('click', () => switchLanguageAndReload('en'));
    }

    // Always update button state first
    updateLanguageButtons();

    // Then apply translations if available
    if (translations['zh'] && translations['en']) {
        applyTranslations();
    }
}

// Switch language and reload page
function switchLanguageAndReload(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        // Reload page
        location.reload();
    }
}

// Set current language (for internal use, no reload)
function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        applyTranslations();
        // Emit custom event for external listeners
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    }
}

// Get current language
function getLanguage() {
    return currentLanguage;
}

// Get translation for a key
function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations[currentLanguage];

    for (const k of keys) {
        if (value && value[k]) {
            value = value[k];
        } else {
            console.warn(`Translation key not found: ${key} for language: ${currentLanguage}`);
            return key;
        }
    }

    // Replace parameters in the translation value
    if (typeof value === 'string') {
        return replaceParams(value, params);
    }

    return value;
}

// Replace parameters in a string (e.g., "${minutes}分钟前")
function replaceParams(str, params) {
    return str.replace(/\$\{(\w+)\}/g, (_, key) => {
        return params[key] !== undefined ? params[key] : `${key}`;
    });
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
    // Update page title
    const titleEl = document.querySelector('title');
    if (titleEl && titleEl.hasAttribute('data-i18n')) {
        const key = titleEl.getAttribute('data-i18n');
        document.title = t(key);
    }

    // Update all elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        el.textContent = text;
    });

    // Update elements with data-i18n-placeholder attribute
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // Update elements with data-i18n-title attribute
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    // Update language buttons
    updateLanguageButtons();
}

// Update language button states
function updateLanguageButtons() {
    const zhBtn = document.getElementById('langZh');
    const enBtn = document.getElementById('langEn');

    if (zhBtn && enBtn) {
        if (currentLanguage === 'zh') {
            zhBtn.classList.add('active');
            enBtn.classList.remove('active');
        } else {
            zhBtn.classList.remove('active');
            enBtn.classList.add('active');
        }
    }
}

// Initialize i18n (called from translation files)
function initI18n() {
    // This is called by translation files, actual init happens when all are loaded
}

// Export for global access
window.i18n = {
    t,
    setLanguage,
    getLanguage,
    applyTranslations,
    addTranslation,
    initI18n,
};

// Initialize on DOM ready (fallback)
setTimeout(() => {
    if (!initialized && loadedTranslations.size >= 2) {
        initI18nInternal();
    }
}, 100);