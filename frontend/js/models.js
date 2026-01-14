// Model management functions
let currentModelsPage = 1;
const MODELS_PER_PAGE = 10;

// Initialize model management functionality
function initModelManagement() {
    // Add event listeners with error handling
    try {
        const addModelBtn = document.getElementById('addModelBtn');
        if (addModelBtn && !addModelBtn.hasAttribute('data-model-events-attached')) {
            addModelBtn.addEventListener('click', openAddModelModal);
            addModelBtn.setAttribute('data-model-events-attached', 'true');
        }

        const saveModelBtn = document.getElementById('saveModelBtn');
        if (saveModelBtn && !saveModelBtn.hasAttribute('data-model-events-attached')) {
            saveModelBtn.addEventListener('click', saveModel);
            saveModelBtn.setAttribute('data-model-events-attached', 'true');
        }

        const cancelModelBtn = document.getElementById('cancelModelBtn');
        if (cancelModelBtn && !cancelModelBtn.hasAttribute('data-model-events-attached')) {
            cancelModelBtn.addEventListener('click', closeModelModal);
            cancelModelBtn.setAttribute('data-model-events-attached', 'true');
        }

        const searchModelInput = document.getElementById('searchModelInput');
        if (searchModelInput && !searchModelInput.hasAttribute('data-model-events-attached')) {
            searchModelInput.addEventListener('input', handleModelSearchInput);
            searchModelInput.setAttribute('data-model-events-attached', 'true');
        }

        const clearSearchModel = document.getElementById('clearSearchModel');
        if (clearSearchModel && !clearSearchModel.hasAttribute('data-model-events-attached')) {
            clearSearchModel.addEventListener('click', clearModelSearch);
            clearSearchModel.setAttribute('data-model-events-attached', 'true');
        }

        // Add event listener for model modal close button
        const modelModal = document.getElementById('modelModal');
        if (modelModal) {
            const closeBtn = modelModal.querySelector('.close-btn');
            if (closeBtn && !closeBtn.hasAttribute('data-model-events-attached')) {
                closeBtn.addEventListener('click', closeModelModal);
                closeBtn.setAttribute('data-model-events-attached', 'true');
            }
        }
    } catch (error) {
        console.error('Error initializing model management:', error);
    }

    // Load models
    loadModels(1);
}

// Load models with pagination
function loadModels(page = 1, search = '') {
    currentModelsPage = page;
    const url = search
        ? `/api/models/search?search=${encodeURIComponent(search)}`
        : `/api/models`;

    fetch(url)
        .then(response => response.json())
        .then(models => {
            if (Array.isArray(models)) {
                renderModels(models, page);
                renderModelPagination(models.length, page);
            } else {
                renderModels([], page);
                renderModelPagination(0, page);
            }
        })
        .catch(error => {
            console.error('Error loading models:', error);
            showToast(window.i18n?.t ? window.i18n.t('loadFailed') : '加载模型失败', 'error');
            renderModels([], page);
            renderModelPagination(0, page);
        });
}

// Render models in the grid
function renderModels(models, page) {
    const grid = document.getElementById('modelsGrid');
    if (!grid) return;

    if (models.length === 0) {
        grid.innerHTML = '<div class="no-models" data-i18n="noModels">暂无模型数据</div>';
        // Apply i18n to newly added elements
        applyI18nToNewElements(grid);
        return;
    }

    // For simplicity, we'll show all models on one page for now
    // In a real implementation, you would implement proper pagination
    const startIndex = (page - 1) * MODELS_PER_PAGE;
    const paginatedModels = models.slice(startIndex, startIndex + MODELS_PER_PAGE);

    grid.innerHTML = paginatedModels.map(model => createModelCard(model)).join('');

    // Apply i18n to newly added elements
    applyI18nToNewElements(grid);

    // Use setTimeout to ensure DOM is updated before attaching event listeners
    setTimeout(() => {
        // Add event listeners to the new elements
        paginatedModels.forEach(model => {
            const editBtn = document.getElementById(`edit-model-${model.id}`);
            const deleteBtn = document.getElementById(`delete-model-${model.id}`);
            const toggleBtn = document.getElementById(`toggle-model-${model.id}`);

            if (editBtn) {
                // Remove existing event listeners to prevent duplicates
                const newEditBtn = editBtn.cloneNode(true);
                editBtn.parentNode.replaceChild(newEditBtn, editBtn);
                newEditBtn.addEventListener('click', () => openEditModelModal(model));
            }

            if (deleteBtn) {
                // Remove existing event listeners to prevent duplicates
                const newDeleteBtn = deleteBtn.cloneNode(true);
                deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
                newDeleteBtn.addEventListener('click', () => deleteModel(model.id));
            }

            if (toggleBtn) {
                // Remove existing event listeners to prevent duplicates
                const newToggleBtn = toggleBtn.cloneNode(true);
                toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
                newToggleBtn.addEventListener('click', () => toggleModel(model.id));
            }
        });

        // Add click event listeners for model ID copy functionality
        const clickableModelIds = grid.querySelectorAll('.clickable-model-id');
        clickableModelIds.forEach(element => {
            element.addEventListener('click', function() {
                const modelId = this.getAttribute('data-model-id');
                if (modelId) {
                    copyToClipboard(modelId);
                }
            });
        });
    }, 0);
}

// Create a model card HTML
function createModelCard(model) {
    const isClaude = model.provider === 'claude';
    const claudeBadge = isClaude ?
        '<span class="claude-badge" data-i18n="claude">Claude</span>' : '';

    const enabledClass = model.enabled ? 'enabled' : 'disabled';
    const enabledText = window.i18n?.t ?
        window.i18n.t(model.enabled ? 'enabled' : 'disabled') :
        (model.enabled ? '已启用' : '已禁用');

    // Generate associated models HTML
    let assModelsHtml = '';
    if (model.ass_model_ids && model.ass_model_ids.length > 0) {
        const allModels = model.ass_model_ids.map(id =>
            `<span class="model-tag clickable-model-id" data-model-id="${escapeHtml(id)}" title="Copy">${escapeHtml(id)}</span>`
        ).join(' ');
        assModelsHtml = `
            <div class="model-card-ass-models-container">
                <div class="model-card-ass-models">
                    ${allModels}
                </div>
            </div>
        `;
    } else {
        assModelsHtml = '<span data-i18n="none">' +
            (window.i18n?.t ? window.i18n.t('none') : '无') + '</span>';
    }

    return `
        <div class="account-card">
            <div class="card-header">
                <h3 class="card-title">
                    ${escapeHtml(model.model_id)}
                    ${claudeBadge}
                </h3>
                <span class="card-status ${enabledClass}">${escapeHtml(enabledText)}</span>
            </div>

            <div class="card-body">
                <div class="card-field">
                    <div class="card-label" data-i18n="provider">提供商</div>
                    <div class="card-value">${escapeHtml(model.provider)}</div>
                </div>

                <div class="card-field ass-models-field">
                    <div class="card-label" data-i18n="assModelIds">关联模型</div>
                    <div class="card-value">
                        ${assModelsHtml}
                    </div>
                </div>

                <div class="card-field">
                    <div class="card-label" data-i18n="updatedAt">更新时间</div>
                    <div class="card-value">${formatTimestamp(model.updated_at)}</div>
                </div>
            </div>

            <div class="card-actions">
                <button class="card-btn edit" id="edit-model-${model.id}" data-i18n="edit">编辑</button>
                <button class="card-btn toggle" id="toggle-model-${model.id}"
                        data-i18n="${model.enabled ? 'disable' : 'enable'}">
                    ${model.enabled ?
                      (window.i18n?.t ? window.i18n.t('disable') : '禁用') :
                      (window.i18n?.t ? window.i18n.t('enable') : '启用')}
                </button>
                <button class="card-btn delete" id="delete-model-${model.id}" data-i18n="delete">删除</button>
            </div>
        </div>
    `;
}

// Render pagination for models
function renderModelPagination(totalCount, currentPage) {
    const pagination = document.getElementById('modelPagination');
    if (!pagination) return;

    // For simplicity, we'll just show a simple pagination
    // In a real implementation, you would calculate proper pagination
    const totalPages = Math.ceil(totalCount / MODELS_PER_PAGE);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="pagination-container">';

    // Previous button
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}
                onclick="loadModels(${currentPage - 1})" data-i18n="previous">上一页</button>
    `;

    // Page numbers (simplified)
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="pagination-btn active">${i}</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn" onclick="loadModels(${i})">${i}</button>`;
        }
    }

    // Next button
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}
                onclick="loadModels(${currentPage + 1})" data-i18n="next">下一页</button>
    `;

    paginationHTML += '</div>';
    pagination.innerHTML = paginationHTML;
}

// Open add model modal
function openAddModelModal() {
    document.getElementById('modelForm').reset();
    document.getElementById('modelId').value = '';
    const titleElement = document.getElementById('modelModalTitle');
    titleElement.setAttribute('data-i18n', 'addModelTitle');

    // Apply translation if i18n is available
    if (window.i18n && typeof window.i18n.t === 'function') {
        titleElement.textContent = window.i18n.t('addModelTitle');
    } else {
        titleElement.textContent = '添加模型';
    }

    // Make model_id field editable when adding new model
    const modelIdInput = document.getElementById('model_id');
    modelIdInput.disabled = false;
    modelIdInput.value = '';

    document.getElementById('model_enabled').checked = true;

    // Load associated models for checkboxes
    loadAssociatedModelCheckboxes();

    document.getElementById('modelModal').style.display = 'flex';
}

// Open edit model modal
function openEditModelModal(model) {
    document.getElementById('modelId').value = model.id;
    document.getElementById('model_id').value = model.model_id;
    document.getElementById('provider').value = model.provider;
    document.getElementById('model_enabled').checked = model.enabled;

    const titleElement = document.getElementById('modelModalTitle');
    titleElement.setAttribute('data-i18n', 'editModelTitle');

    // Apply translation if i18n is available
    if (window.i18n && typeof window.i18n.t === 'function') {
        titleElement.textContent = window.i18n.t('editModelTitle');
    } else {
        titleElement.textContent = '编辑模型';
    }

    // Make model_id field non-editable when editing
    const modelIdInput = document.getElementById('model_id');
    modelIdInput.disabled = true;

    // Load associated models for checkboxes and check the ones that are selected
    loadAssociatedModelCheckboxes(model.ass_model_ids || []);

    document.getElementById('modelModal').style.display = 'flex';
}

// Load associated model checkboxes
function loadAssociatedModelCheckboxes(selectedIds = []) {
    const container = document.getElementById('assModelIdsContainer');
    if (!container) return;

    // Fetch all model IDs from debug API to populate the checkboxes
    fetch('/api/debug/models')
        .then(response => response.json())
        .then(data => {
            // Extract model IDs from the response
            // The response format is { "data": [ { "id": "model_id", ... } ] }
            let allModelIds = [];
            if (data && data.data && Array.isArray(data.data)) {
                allModelIds = data.data.map(model => model.id);
            }

            // Remove duplicates and sort alphabetically
            allModelIds = [...new Set(allModelIds)].sort();

            // Filter out the current model if we're editing
            const currentModelId = document.getElementById('model_id').value;
            const filteredModelIds = currentModelId
                ? allModelIds.filter(id => id !== currentModelId)
                : allModelIds;

            // Check if we're in custom mode (any selected ID is not in the list)
            let isCustomMode = false;
            let customValue = '';
            let actualSelectedIds = selectedIds;

            if (selectedIds.length > 0) {
                // Check if ANY selected ID is custom (not in filteredModelIds)
                const hasCustom = selectedIds.some(id => !filteredModelIds.includes(id));
                if (hasCustom) {
                    // This is custom mode - join all IDs with commas
                    isCustomMode = true;
                    customValue = selectedIds.join(', ');
                    actualSelectedIds = ['__CUSTOM__'];
                }
            }

            // Render the search input and checkboxes
            renderModelCheckboxesWithSearch(container, filteredModelIds, actualSelectedIds);

            // If custom mode, set the custom input value
            if (isCustomMode) {
                const customInput = document.getElementById('customModelIdInput');
                if (customInput) {
                    customInput.value = customValue;
                    customInput.style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Error loading associated models:', error);
            container.innerHTML = '<div data-i18n="loadModelsError">' +
                (window.i18n?.t ? window.i18n.t('loadModelsError') : '加载模型列表失败') + '</div>';
        });
}

// Render model checkboxes with search functionality
function renderModelCheckboxesWithSearch(container, modelIds, selectedIds) {
    if (modelIds.length === 0) {
        container.innerHTML = '<div data-i18n="noOtherModels">' +
            (window.i18n?.t ? window.i18n.t('noOtherModels') : '没有其他模型可关联') + '</div>';
        applyI18nToNewElements(container);
        return;
    }

    // Check if custom mode is selected (selectedIds contains '__CUSTOM__')
    const isCustomMode = selectedIds.includes('__CUSTOM__');
    
    // Sort model IDs: selected ones first, then unselected ones (but only if not in custom mode)
    let sortedModelIds;
    if (isCustomMode) {
        sortedModelIds = modelIds;
    } else {
        const selectedModelIds = modelIds.filter(id => selectedIds.includes(id));
        const unselectedModelIds = modelIds.filter(id => !selectedIds.includes(id));
        sortedModelIds = [...selectedModelIds, ...unselectedModelIds];
    }

    // Create search input, select all button, and checkboxes container
    const searchHtml = `
        <div class="model-search-container">
            <div class="search-and-select-container">
                <input type="text" id="modelSearchInput" class="search-input"
                       placeholder="${window.i18n?.t ? window.i18n.t('searchModel') : '搜索模型...'}" 
                       data-i18n-placeholder="searchModel"
                       ${isCustomMode ? 'disabled' : ''}>
                <button type="button" id="selectAllModelsBtn" class="select-all-btn" 
                        data-i18n="selectAll"
                        ${isCustomMode ? 'disabled' : ''}>
                    ${window.i18n?.t ? window.i18n.t('selectAll') : '全选'}
                </button>
            </div>
            <div class="model-checkboxes" id="modelCheckboxes">
                <div class="checkbox-item custom-mode-item" data-model-id="__CUSTOM__">
                    <input type="checkbox" id="ass_model___CUSTOM__" value="__CUSTOM__"
                           ${isCustomMode ? 'checked' : ''}>
                    <label for="ass_model___CUSTOM__" data-i18n="customMode">${window.i18n?.t ? window.i18n.t('customMode') : '自定义'}</label>
                    <input type="text" id="customModelIdInput" class="custom-model-input"
                           placeholder="${window.i18n?.t ? window.i18n.t('customModelIdPlaceholder') : '输入自定义模型ID...'}"
                           data-i18n-placeholder="customModelIdPlaceholder"
                           style="display: ${isCustomMode ? 'block' : 'none'};">
                </div>
                ${sortedModelIds.map(modelId => `
                    <div class="checkbox-item" data-model-id="${escapeHtml(modelId)}">
                        <input type="checkbox" id="ass_model_${modelId}" value="${modelId}"
                               ${selectedIds.includes(modelId) && !isCustomMode ? 'checked' : ''}
                               ${isCustomMode ? 'disabled' : ''}>
                        <label for="ass_model_${modelId}">${escapeHtml(modelId)}</label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = searchHtml;

    // Apply i18n to newly added elements
    applyI18nToNewElements(container);

    // Add event listener for search input
    const searchInput = document.getElementById('modelSearchInput');
    const checkboxesContainer = document.getElementById('modelCheckboxes');
    const selectAllBtn = document.getElementById('selectAllModelsBtn');
    const customCheckbox = document.getElementById('ass_model___CUSTOM__');
    const customInput = document.getElementById('customModelIdInput');

    // Handle custom mode checkbox
    if (customCheckbox && customInput) {
        customCheckbox.addEventListener('change', function(e) {
            const isChecked = e.target.checked;
            customInput.style.display = isChecked ? 'block' : 'none';
            
            if (isChecked) {
                // Disable and uncheck all other checkboxes
                const allCheckboxes = checkboxesContainer.querySelectorAll('input[type="checkbox"]:not(#ass_model___CUSTOM__)');
                allCheckboxes.forEach(cb => {
                    cb.checked = false;
                    cb.disabled = true;
                });
                // Disable search and select all
                if (searchInput) searchInput.disabled = true;
                if (selectAllBtn) selectAllBtn.disabled = true;
                // Focus on custom input
                customInput.focus();
            } else {
                // Enable all other checkboxes
                const allCheckboxes = checkboxesContainer.querySelectorAll('input[type="checkbox"]:not(#ass_model___CUSTOM__)');
                allCheckboxes.forEach(cb => {
                    cb.disabled = false;
                });
                // Enable search and select all
                if (searchInput) searchInput.disabled = false;
                if (selectAllBtn) selectAllBtn.disabled = false;
                // Clear custom input
                customInput.value = '';
            }
        });
    }

    if (searchInput && checkboxesContainer) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const checkboxItems = checkboxesContainer.querySelectorAll('.checkbox-item');

            checkboxItems.forEach(item => {
                const modelId = item.getAttribute('data-model-id');
                if (modelId && modelId.toLowerCase().includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // Add event listener for select all button
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            toggleSelectAllModels();
        });
    }
}

// Apply i18n to newly added elements
function applyI18nToNewElements(container) {
    // Apply translations to all elements with data-i18n attribute
    const elements = container.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (window.i18n && typeof window.i18n.t === 'function') {
            const text = window.i18n.t(key);
            el.textContent = text;
        }
    });

    // Apply placeholder translations
    const placeholderElements = container.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (window.i18n && typeof window.i18n.t === 'function') {
            el.placeholder = window.i18n.t(key);
        }
    });
}

// Toggle select all models (only visible ones, excluding custom option)
function toggleSelectAllModels() {
    const checkboxesContainer = document.getElementById('modelCheckboxes');
    const checkboxItems = checkboxesContainer.querySelectorAll('.checkbox-item:not(.custom-mode-item)');
    const visibleCheckboxes = Array.from(checkboxItems).filter(item => item.style.display !== 'none');

    // Check if all visible checkboxes are currently selected
    const allVisibleSelected = visibleCheckboxes.every(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        return checkbox && checkbox.checked;
    });

    // Toggle selection state for all visible checkboxes (excluding custom)
    visibleCheckboxes.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.id !== 'ass_model___CUSTOM__') {
            checkbox.checked = !allVisibleSelected;
        }
    });
}

// Close model modal
function closeModelModal() {
    document.getElementById('modelModal').style.display = 'none';
}

// Validate model ID according to rules
function validateModelId(modelId) {
    if (!modelId || modelId.trim() === '') {
        return { valid: false, message: window.i18n?.t ? window.i18n.t('modelIdRequired') : '模型ID不能为空' };
    }

    // Convert to lowercase
    modelId = modelId.toLowerCase().trim();

    // Check if it starts with aio_
    if (modelId.startsWith('aio_')) {
        // For aio_ models, remove the prefix for length check
        const withoutPrefix = modelId.substring(4);
        if (withoutPrefix.length > 10) {
            return { valid: false, message: window.i18n?.t ? window.i18n.t('modelIdTooLong') : '自定义模型ID长度不能超过10个字符（不包含aio_前缀）' };
        }
        // Check allowed characters for aio_ models
        if (!/^[a-z0-9_-]+$/.test(withoutPrefix)) {
            return { valid: false, message: window.i18n?.t ? window.i18n.t('modelIdInvalidChars') : '自定义模型ID只能包含小写字母、数字、下划线和连字符' };
        }
        // Check that _ and - are not at the beginning or end of the part after aio_
        if (withoutPrefix.startsWith('_') || withoutPrefix.startsWith('-') ||
            withoutPrefix.endsWith('_') || withoutPrefix.endsWith('-')) {
            return { valid: false, message: window.i18n?.t ? window.i18n.t('modelIdInvalidFormat') : '自定义模型ID中的下划线和连字符不能在开头或结尾' };
        }
    } else {
        // For non-aio models, auto-prepend aio_
        modelId = 'aio_' + modelId;
        if (modelId.substring(4).length > 10) {
            return { valid: false, message: window.i18n?.t ? window.i18n.t('modelIdTooLong') : '模型ID长度不能超过10个字符（不包含aio_前缀）' };
        }
        // Check allowed characters
        const withoutPrefix = modelId.substring(4);
        if (!/^[a-z0-9_-]+$/.test(withoutPrefix)) {
            return { valid: false, message: window.i18n?.t ? window.i18n.t('modelIdInvalidChars') : '模型ID只能包含小写字母、数字、下划线和连字符' };
        }
        // Check that _ and - are not at the beginning or end of the part after aio_
        if (withoutPrefix.startsWith('_') || withoutPrefix.startsWith('-') ||
            withoutPrefix.endsWith('_') || withoutPrefix.endsWith('-')) {
            return { valid: false, message: window.i18n?.t ? window.i18n.t('modelIdInvalidFormat') : '模型ID中的下划线和连字符不能在开头或结尾' };
        }
    }

    return { valid: true, message: '', modelId: modelId };
}

// Save model (create or update)
function saveModel() {
    const id = document.getElementById('modelId').value;
    let modelId = document.getElementById('model_id').value;
    const provider = document.getElementById('provider').value;
    const enabled = document.getElementById('model_enabled').checked;

    // Validate model ID
    const validation = validateModelId(modelId);
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
    }

    // Use the validated and processed model ID
    modelId = validation.modelId;

    // Get selected associated models
    const customCheckbox = document.getElementById('ass_model___CUSTOM__');
    const customInput = document.getElementById('customModelIdInput');
    const otherCheckboxes = document.querySelectorAll('#assModelIdsContainer input[type="checkbox"]:checked:not(#ass_model___CUSTOM__)');
    
    const isCustomSelected = customCheckbox && customCheckbox.checked;
    const hasOtherSelected = otherCheckboxes.length > 0;
    
    // Validation: Cannot select both custom and other models
    if (isCustomSelected && hasOtherSelected) {
        showToast(window.i18n?.t ? window.i18n.t('assModelIdsConflict') : '不能同时选择自定义和其他模型', 'error');
        return;
    }
    
    // Validation: Must select at least one
    if (!isCustomSelected && !hasOtherSelected) {
        showToast(window.i18n?.t ? window.i18n.t('assModelIdsRequired') : '请至少选择一个关联模型或使用自定义模式', 'error');
        return;
    }

    let assModelIds = [];

    // Check if custom mode is selected
    if (isCustomSelected) {
        const customValue = customInput ? customInput.value.trim() : '';
        if (!customValue) {
            showToast(window.i18n?.t ? window.i18n.t('customModeRequired') : '自定义模式下必须输入模型ID', 'error');
            return;
        }
        // In custom mode, split by comma and trim each ID
        assModelIds = customValue.split(',').map(id => id.trim()).filter(id => id.length > 0);
        if (assModelIds.length === 0) {
            showToast(window.i18n?.t ? window.i18n.t('customModeRequired') : '自定义模式下必须输入模型ID', 'error');
            return;
        }
    } else {
        // Normal mode: get all checked checkboxes except custom
        assModelIds = Array.from(otherCheckboxes).map(cb => cb.value);
    }

    const modelData = {
        model_id: modelId,
        ass_model_ids: assModelIds,
        provider: provider,
        enabled: enabled
    };

    const url = id ? `/api/models/${id}` : '/api/models';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(modelData)
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(errorData => {
                throw new Error(errorData.error || 'Failed to save model');
            });
        }
    })
    .then(() => {
        closeModelModal();
        loadModels(currentModelsPage);
        showToast(id ?
            (window.i18n?.t ? window.i18n.t('updateSuccess') : '模型更新成功') :
            (window.i18n?.t ? window.i18n.t('createSuccess') : '模型创建成功'), 'success');
    })
    .catch(error => {
        console.error('Error saving model:', error);
        showToast(error.message || (id ?
            (window.i18n?.t ? window.i18n.t('updateModelFailed') : '更新模型失败') :
            (window.i18n?.t ? window.i18n.t('createModelFailed') : '创建模型失败')), 'error');
    });
}

// Delete model
function deleteModel(id) {
    showConfirm(
        window.i18n?.t ? window.i18n.t('confirmDeleteModel') : '确定要删除这个模型吗？',
        window.i18n?.t ? window.i18n.t('confirmDelete') : '确认删除'
    ).then(confirmed => {
        if (confirmed) {
            fetch(`/api/models/${id}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {
                    loadModels(currentModelsPage);
                    showToast(window.i18n?.t ? window.i18n.t('deleteSuccess') : '模型删除成功', 'success');
                } else {
                    throw new Error('Failed to delete model');
                }
            })
            .catch(error => {
                console.error('Error deleting model:', error);
                showToast(window.i18n?.t ? window.i18n.t('deleteModelFailed') : '删除模型失败', 'error');
            });
        }
    });
}

// Copy text to clipboard and show toast notification
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(window.i18n?.t ? window.i18n.t('copiedToClipboard') : '已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast(window.i18n?.t ? window.i18n.t('copyFailed') : '复制失败', 'error');
    });
}

// Toggle model enabled status
function toggleModel(id) {
    fetch(`/api/models/${id}`, {
        method: 'PATCH'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Failed to toggle model');
        }
    })
    .then(() => {
        loadModels(currentModelsPage);
        showToast(window.i18n?.t ? window.i18n.t('updateSuccess') : '模型状态已更新', 'success');
    })
    .catch(error => {
        console.error('Error toggling model:', error);
        showToast(window.i18n?.t ? window.i18n.t('updateModelFailed') : '更新模型状态失败', 'error');
    });
}

// Handle model search input
function handleModelSearchInput(e) {
    const searchTerm = e.target.value;
    const clearBtn = document.getElementById('clearSearchModel');

    if (searchTerm) {
        clearBtn.style.display = 'flex';
        loadModels(1, searchTerm);
    } else {
        clearBtn.style.display = 'none';
        loadModels(1);
    }
}

// Clear model search
function clearModelSearch() {
    document.getElementById('searchModelInput').value = '';
    document.getElementById('clearSearchModel').style.display = 'none';
    loadModels(1);
}


// Utility function to escape HTML
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, '"')
        .replace(/'/g, "'");
}

// Utility function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
}