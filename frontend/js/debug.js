// Global variables
let selectedModelId = '';
let cachedModels = null;

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Wait for i18n to be ready
    function initWhenReady() {
        if (window.i18n && window.i18n.getLanguage) {
            initializeDropdown();
            loadModels();

            // Reload button handler
            const reloadBtn = document.getElementById('reloadBtn');
            reloadBtn.addEventListener('click', reloadModels);
        } else {
            setTimeout(initWhenReady, 50);
        }
    }
    initWhenReady();
});

// Dropdown functionality
let dropdownOpen = false;

function initializeDropdown() {
    const modelDropdown = document.getElementById('modelDropdown');
    const dropdownDisplay = document.getElementById('dropdownDisplay');
    const dropdownArrow = document.getElementById('dropdownArrow');
    const dropdownOptions = document.getElementById('dropdownOptions');
    const modelSearchInput = document.getElementById('modelSearchInput');

    // Toggle dropdown
    dropdownDisplay.addEventListener('click', toggleDropdown);
    dropdownArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!modelDropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    // Search input handler
    modelSearchInput.addEventListener('input', (e) => {
        filterOptions(e.target.value);
    });

    // Prevent dropdown from closing when clicking on search input
    modelSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function toggleDropdown() {
    const modelDropdown = document.getElementById('modelDropdown');
    const dropdownOptions = document.getElementById('dropdownOptions');
    const modelSearchInput = document.getElementById('modelSearchInput');

    dropdownOpen = !dropdownOpen;

    if (dropdownOpen) {
        modelDropdown.classList.add('open');
        dropdownOptions.classList.remove('hidden');
        modelSearchInput.value = '';
        modelSearchInput.focus();
        filterOptions('');
    } else {
        closeDropdown();
    }
}

function closeDropdown() {
    const modelDropdown = document.getElementById('modelDropdown');
    const dropdownOptions = document.getElementById('dropdownOptions');

    dropdownOpen = false;
    modelDropdown.classList.remove('open');
    dropdownOptions.classList.add('hidden');
}

function filterOptions(searchText) {
    const optionsList = document.getElementById('optionsList');
    optionsList.innerHTML = '';

    if (!cachedModels || cachedModels.length === 0) {
        optionsList.innerHTML = `<div class="dropdown-option no-results">${window.i18n.t('loading')}</div>`;
        return;
    }

    const searchLower = searchText.toLowerCase().trim();
    const filteredModels = cachedModels.filter(model => {
        return model.id && model.id.toLowerCase().includes(searchLower);
    });

    if (filteredModels.length === 0) {
        optionsList.innerHTML = `<div class="dropdown-option no-results">${window.i18n.t('noMatchingModels')}</div>`;
        return;
    }

    filteredModels.forEach(model => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        if (model.id === selectedModelId) {
            option.classList.add('selected');
        }

        const accountCount = model.account_list ? model.account_list.length : 0;

        // Highlight search match
        let displayText = model.id;
        if (searchText.length > 0) {
            const regex = new RegExp(`(${escapeRegex(searchText)})`, 'gi');
            displayText = displayText.replace(regex, '<span class="highlight">$1</span>');
        }

        option.innerHTML = `${displayText}<span class="model-count">(${accountCount})</span>`;
        option.addEventListener('click', () => selectModel(model.id, model.id));
        optionsList.appendChild(option);
    });
}

function selectModel(modelId, displayText) {
    selectedModelId = modelId;

    const dropdownDisplay = document.getElementById('dropdownDisplay');
    dropdownDisplay.textContent = displayText;

    closeDropdown();
    displayAccounts();
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Reload models cache
function reloadModels() {
    const reloadBtn = document.getElementById('reloadBtn');

    // Disable button and show loading state
    reloadBtn.disabled = true;
    reloadBtn.textContent = window.i18n.t('refreshing');

    fetch('/api/debug/models/reload', {
        method: 'POST'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showToast(window.i18n.t('refreshTriggered'), 'success');

            // Wait a bit for cache to refresh, then reload data
            setTimeout(() => {
                loadModels();
                // Keep current selection and refresh display
                if (selectedModelId) {
                    displayAccounts();
                    // Update dropdown display with current selection
                    const currentModel = cachedModels.find(m => m.id === selectedModelId);
                    if (currentModel) {
                        const dropdownDisplay = document.getElementById('dropdownDisplay');
                        const accountCount = currentModel.account_list ? currentModel.account_list.length : 0;
                        dropdownDisplay.textContent = `${currentModel.id} (${accountCount})`;
                    }
                }
            }, 1000);
        })
        .catch(error => {
            console.error('Error reloading models:', error);
            showToast(window.i18n.t('refreshFailed'), 'error');
        })
        .finally(() => {
            // Re-enable button
            reloadBtn.disabled = false;
            reloadBtn.textContent = window.i18n.t('refresh');
        });
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found');
        return;
    }

    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Load models from the API (called once on page load)
function loadModels() {
    fetch('/api/debug/models')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.data && Array.isArray(data.data)) {
                // Cache the models data with account_list
                cachedModels = data.data;

                // Populate dropdown with all models
                filterOptions('');
            }
        })
        .catch(error => {
            console.error('Error loading models:', error);
            showToast(window.i18n.t('loadModelsFailed'), 'error');

            // Show error in dropdown
            const optionsList = document.getElementById('optionsList');
            optionsList.innerHTML = `<div class="dropdown-option no-results">${window.i18n.t('loadFailedRetry')}</div>`;
        });
}

// Display accounts for selected model from cached data
function displayAccounts() {
    const grid = document.getElementById('accountsGrid');
    if (!grid) {
        console.error('accountsGrid element not found');
        return;
    }
    grid.innerHTML = '';

    if (!selectedModelId) {
        grid.innerHTML = `<div style="text-align: center; color: #86868b; padding: 40px;">${window.i18n.t('selectModelFirst')}</div>`;
        return;
    }

    if (!cachedModels || !Array.isArray(cachedModels)) {
        grid.innerHTML = `<div style="text-align: center; color: #86868b; padding: 40px;">${window.i18n.t('loadingData')}</div>`;
        return;
    }

    const selectedModel = cachedModels.find(m => m.id === selectedModelId);

    if (!selectedModel || !selectedModel.account_list || !Array.isArray(selectedModel.account_list)) {
        grid.innerHTML = `<div style="text-align: center; color: #86868b; padding: 40px;">${window.i18n.t('noAccountsFound')}</div>`;
        return;
    }

    selectedModel.account_list.forEach(account => {
        const card = createAccountCard(account);
        grid.appendChild(card);
    });
}

// Create a card for an account
function createAccountCard(account) {
    if (!account || typeof account !== 'object') {
        console.error('Invalid account data:', account);
        return document.createElement('div');
    }

    const card = document.createElement('div');
    card.className = 'account-card';

    // Safely format API key
    const apiKey = account.api_key || '';
    const formattedApiKey = apiKey.length > 8 ?
        apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4) :
        '****';

    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const name = escapeHtml(account.name || window.i18n.t('unknown'));
    const baseUrl = escapeHtml(account.base_url || '');
    const enabled = Boolean(account.enabled);
    const accountId = parseInt(account.id) || 0;
    const updatedAt = formatTimestamp(account.updated_at || 0);
    const statusText = enabled ? window.i18n.t('active') : window.i18n.t('inactive');

    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${name}</h3>
            <span class="card-status ${enabled ? 'enabled' : 'disabled'}">
                ${statusText}
            </span>
        </div>
        <div class="card-body">
            <div class="card-field clickable">
                <div>
                    <div class="card-label">${window.i18n.t('baseURL')}</div>
                    <div class="card-value clickable" onclick="copyToText('${accountId}-url', '${baseUrl.replace(/'/g, "\\'")}')">
                        <span id="${accountId}-url">${baseUrl}</span>
                    </div>
                </div>
                <span class="copy-icon" onclick="copyToText('${accountId}-url', '${baseUrl.replace(/'/g, "\\'")}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </span>
            </div>
            <div class="card-field clickable">
                <div>
                    <div class="card-label">${window.i18n.t('apiKey')}</div>
                    <div class="card-value api-key clickable" onclick="copyToText('${accountId}-key', '${apiKey.replace(/'/g, "\\'")}')">
                        <span id="${accountId}-key">${formattedApiKey}</span>
                    </div>
                </div>
                <span class="copy-icon" onclick="copyToText('${accountId}-key', '${apiKey.replace(/'/g, "\\'")}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </span>
            </div>
            <div class="card-field">
                <div>
                    <div class="card-label">${window.i18n.t('lastUpdated')}</div>
                    <div class="card-value">${updatedAt}</div>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Copy text to clipboard
function copyToText(elementId, text) {
    navigator.clipboard.writeText(text).then(() => {
        const element = document.getElementById(elementId);
        const originalText = element.textContent;
        element.textContent = window.i18n.t('copied');
        setTimeout(() => {
            element.textContent = originalText;
        }, 1500);
        showToast(window.i18n.t('copiedToClipboard'), 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast(window.i18n.t('copyFailed'), 'error');
    });
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
    if (!timestamp || timestamp === 0) {
        return window.i18n.t('neverUpdated');
    }
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
        return window.i18n.t('justNow');
    }

    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return window.i18n.t('minutesAgo', { minutes });
    }

    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return window.i18n.t('hoursAgo', { hours });
    }

    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return window.i18n.t('daysAgo', { days });
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}