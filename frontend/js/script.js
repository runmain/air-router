// Global variables
let editingAccountId = null;
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let totalItems = 0;
let searchQuery = '';
let isLoading = false; // Prevent duplicate requests

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Wait for i18n to be ready before loading accounts
    function loadAccountsWhenReady() {
        if (window.i18n && window.i18n.getLanguage) {
            loadAccounts();
        } else {
            setTimeout(loadAccountsWhenReady, 50);
        }
    }
    loadAccountsWhenReady();

    // Set up form submission handler
    const accountForm = document.getElementById('accountForm');
    accountForm.addEventListener('submit', handleFormSubmit);

    // Modal controls
    const modal = document.getElementById('accountModal');
    const addBtn = document.getElementById('addAccountBtn');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');

    addBtn.addEventListener('click', () => {
        clearForm();
        document.getElementById('name').disabled = false;
        document.getElementById('modalTitle').textContent = window.i18n.t('addAccountTitle');
        modal.style.display = 'flex';
    });

    saveBtn.addEventListener('click', () => {
        accountForm.requestSubmit();
    });

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    // Search on input with debounce (1 second delay)
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const newValue = e.target.value.trim();
            // Only reload if value actually changed
            if (newValue !== searchQuery) {
                searchQuery = newValue;
                currentPage = 1; // Reset to first page when searching
                loadAccounts();
            }
        }, 1000);
    });

    // Clear search
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        currentPage = 1;
        loadAccounts();
    });
});

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found');
        return;
    }

    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show confirm dialog
function showConfirm(message, title = '确认') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmDialog');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmOk = document.getElementById('confirmOk');
        const confirmCancel = document.getElementById('confirmCancel');

        // Set content
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;

        // Show dialog
        dialog.classList.remove('hidden');
        dialog.classList.add('show');

        // Handle OK button click
        const handleOk = () => {
            dialog.classList.remove('show');
            dialog.classList.add('hidden');
            confirmOk.removeEventListener('click', handleOk);
            confirmCancel.removeEventListener('click', handleCancel);
            resolve(true);
        };

        // Handle Cancel button click
        const handleCancel = () => {
            dialog.classList.remove('show');
            dialog.classList.add('hidden');
            confirmOk.removeEventListener('click', handleOk);
            confirmCancel.removeEventListener('click', handleCancel);
            resolve(false);
        };

        confirmOk.addEventListener('click', handleOk);
        confirmCancel.addEventListener('click', handleCancel);
    });
}

// Load accounts from the API with pagination and search
function loadAccounts() {
    // Prevent duplicate requests
    if (isLoading) {
        return;
    }
    isLoading = true;

    let url = `/api/accounts?page=${currentPage}&page_size=${pageSize}`;
    if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const grid = document.getElementById('accountsGrid');
            if (!grid) {
                console.error('accountsGrid element not found');
                return;
            }
            grid.innerHTML = '';

            // Update pagination state - ensure accounts is an array
            const accounts = Array.isArray(data.accounts) ? data.accounts :
                             (Array.isArray(data) ? data : []);
            totalItems = parseInt(data.total) || 0;
            totalPages = parseInt(data.total_pages) || 1;
            currentPage = parseInt(data.page) || 1;
            pageSize = parseInt(data.page_size) || pageSize;
            // Don't override searchQuery from server response, it may cause loops
            const serverSearch = data.search || '';

            // Update search input value only if they differ
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value !== serverSearch) {
                searchInput.value = serverSearch;
            }

            accounts.forEach(account => {
                const card = createAccountCard(account);
                grid.appendChild(card);
            });

            // Show/hide clear search button
            const clearBtn = document.getElementById('clearSearch');
            if (clearBtn) {
                clearBtn.style.display = searchInput.value ? 'block' : 'none';
            }

            // Update pagination controls
            renderPagination();
        })
        .catch(error => {
            console.error('Error loading accounts:', error);
        })
        .finally(() => {
            isLoading = false;
        });
}

// Render pagination controls
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) {
        console.error('pagination element not found');
        return;
    }
    pagination.innerHTML = '';

    if (totalPages <= 1) {
        return; // Hide pagination if only one page
    }

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '上一页';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadAccounts();
        }
    };
    paginationContainer.appendChild(prevBtn);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        const firstBtn = createPageButton(1);
        paginationContainer.appendChild(firstBtn);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPageButton(i);
        paginationContainer.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        const lastBtn = createPageButton(totalPages);
        paginationContainer.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '下一页';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadAccounts();
        }
    };
    paginationContainer.appendChild(nextBtn);

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页，共 ${totalItems} 条`;
    paginationContainer.appendChild(pageInfo);

    pagination.appendChild(paginationContainer);
}

// Create a page button
function createPageButton(page) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn';
    if (page === currentPage) {
        btn.classList.add('active');
    }
    btn.textContent = page;
    btn.onclick = () => {
        if (page !== currentPage) {
            currentPage = page;
            loadAccounts();
        }
    };
    return btn;
}

// Copy text to clipboard
function copyToText(elementId, text) {
    navigator.clipboard.writeText(text).then(() => {
        const element = document.getElementById(elementId);
        const originalText = element.textContent;
        element.textContent = '已复制';
        setTimeout(() => {
            element.textContent = originalText;
        }, 1500);
        showToast('已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('复制失败', 'error');
    });
}

// Open URL in new window (strips path from baseURL)
function openUrl(url) {
    if (!url || !url.startsWith('http')) {
        showToast(window.i18n.t('invalidURL'), 'error');
        return;
    }

    // Strip path from URL, keep only protocol://domain:port
    const urlPattern = /^(https?:\/\/[^\/]+)/;
    const match = url.match(urlPattern);
    if (match) {
        window.open(match[1], '_blank', 'noopener,noreferrer');
    } else {
        showToast(window.i18n.t('invalidURL'), 'error');
    }
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
    if (!timestamp || timestamp === 0) {
        return window.i18n.t('neverUpdated');
    }
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // If less than a minute ago
    if (diff < 60000) {
        return window.i18n.t('justNow');
    }

    // If less than an hour ago
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return window.i18n.t('minutesAgo', { minutes });
    }

    // If less than a day ago
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return window.i18n.t('hoursAgo', { hours });
    }

    // If less than a week ago
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return window.i18n.t('daysAgo', { days });
    }

    // Otherwise return formatted date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

    // Get translations
    const activeText = window.i18n.t('active');
    const inactiveText = window.i18n.t('inactive');
    const baseURLLabel = window.i18n.t('baseURL');
    const apiKeyLabel = window.i18n.t('apiKey');
    const lastUpdatedLabel = window.i18n.t('lastUpdated');
    const editText = window.i18n.t('edit');
    const deleteText = window.i18n.t('delete');
    const enableText = window.i18n.t('enable');
    const disableText = window.i18n.t('disable');

    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${name}</h3>
            <span class="card-status ${enabled ? 'enabled' : 'disabled'}">
                ${enabled ? activeText : inactiveText}
            </span>
        </div>
        <div class="card-body">
            <div class="card-field clickable">
                <div>
                    <div class="card-label">${baseURLLabel}</div>
                    <div class="card-value clickable" onclick="openUrl('${baseUrl.replace(/'/g, "\\'")}')">
                        <span id="${accountId}-url">${baseUrl}</span>
                    </div>
                </div>
            </div>
            <div class="card-field clickable">
                <div>
                    <div class="card-label">${apiKeyLabel}</div>
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
                    <div class="card-label">${lastUpdatedLabel}</div>
                    <div class="card-value">${updatedAt}</div>
                </div>
            </div>
        </div>
        <div class="card-actions">
            <button class="card-btn edit" onclick="editAccount(${accountId})">${editText}</button>
            <button class="card-btn delete" onclick="deleteAccount(${accountId})">${deleteText}</button>
            <button class="card-btn toggle" onclick="toggleAccount(${accountId})">
                ${enabled ? disableText : enableText}
            </button>
        </div>
    `;

    return card;
}

// Handle form submission (create or update account)
function handleFormSubmit(event) {
    event.preventDefault();

    // Get form data
    const accountData = {
        name: document.getElementById('name').value,
        base_url: document.getElementById('base_url').value.trim(),
        api_key: document.getElementById('api_key').value.trim(),
        ext: document.getElementById('ext').value,
        enabled: true // Default to enabled
    };

    if (editingAccountId) {
        // Update existing account
        updateAccount(editingAccountId, accountData);
    } else {
        // Create new account
        createAccount(accountData);
    }
}

// Create a new account
function createAccount(accountData) {
    fetch('/api/accounts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
    })
    .then(async response => {
        if (response.status === 201) {
            return response.json();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || '创建账户失败');
        }
    })
    .then(account => {
        // Clear form and reload accounts
        clearForm();
        currentPage = 1; // Go to first page after creating
        loadAccounts();
        document.getElementById('accountModal').style.display = 'none';
        showToast('账户创建成功！', 'success');
    })
    .catch(error => {
        console.error('Error creating account:', error);
        showToast('创建账户失败: ' + error.message, 'error');
    });
}

// Edit an account
function editAccount(id) {
    fetch(`/api/accounts/${id}`)
        .then(response => response.json())
        .then(account => {
            // Fill form with account data
            document.getElementById('accountId').value = account.id;
            document.getElementById('name').value = account.name;
            document.getElementById('name').disabled = true;
            document.getElementById('base_url').value = account.base_url;
            document.getElementById('api_key').value = account.api_key;
            document.getElementById('ext').value = account.ext || '';

            // Set editing mode
            editingAccountId = account.id;

            // Change modal title and button text
            document.getElementById('modalTitle').textContent = window.i18n.t('editAccountTitle');
            document.getElementById('saveBtn').textContent = window.i18n.t('updateAccount');
            document.getElementById('accountModal').style.display = 'flex';
        })
        .catch(error => {
            console.error('Error loading account:', error);
            showToast(window.i18n.t('loadAccountFailed') + ' ' + error.message, 'error');
        });
}

// Update an existing account
function updateAccount(id, accountData) {
    fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
    })
    .then(async response => {
        if (response.ok) {
            return response.json();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || '更新账户失败');
        }
    })
    .then(account => {
        // Clear form and reload accounts
        clearForm();
        loadAccounts();
        document.getElementById('accountModal').style.display = 'none';
        showToast(window.i18n.t('updateSuccess'), 'success');
    })
    .catch(error => {
        console.error('Error updating account:', error);
        showToast(window.i18n.t('updateAccountFailed') + ' ' + error.message, 'error');
    });
}

// Delete an account
async function deleteAccount(id) {
    const confirmed = await showConfirm(window.i18n.t('confirmDeleteAccount'), 'confirm');
    if (confirmed) {
        fetch(`/api/accounts/${id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.status === 204) {
                // Reload accounts
                loadAccounts();
                showToast(window.i18n.t('deleteSuccess'), 'success');
            } else {
                throw new Error(window.i18n.t('deleteFailed'));
            }
        })
        .catch(error => {
            console.error('Error deleting account:', error);
            showToast(window.i18n.t('deleteAccountFailed') + ' ' + error.message, 'error');
        });
    }
}

// Toggle account enabled/disabled status
function toggleAccount(id) {
    fetch(`/api/accounts/${id}`, {
        method: 'PATCH'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(window.i18n.t('toggleFailed'));
        }
    })
    .then(account => {
        // Reload accounts to show updated status
        loadAccounts();
        const action = account.enabled ? window.i18n.t('enable') : window.i18n.t('disable');
        showToast(window.i18n.t('actionSuccess', { action }), 'success');
    })
    .catch(error => {
        console.error('Error toggling account:', error);
        showToast(window.i18n.t('toggleStatusFailed') + ' ' + error.message, 'error');
    });
}

// Clear the form and reset editing mode
function clearForm() {
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    editingAccountId = null;
    document.getElementById('saveBtn').textContent = window.i18n.t('saveAccount');
}