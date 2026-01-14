// English translations
const enUS = {
  // Page Titles
  accountManagement: "Account Management",
  debugPage: "Debug Info",

  // Tabs
  tabAccounts: "Provider",
  tabAllInOne: "Model",
  allInOneContent: "models",

  // Confirmation Dialog
  confirm: "Confirm",
  confirmDelete: "Are you sure you want to perform this operation?",
  confirmDeleteAccount: "Are you sure you want to delete this account?",
  confirmDeleteModel: "Are you sure you want to delete this model?",
  cancel: "Cancel",
  ok: "OK",

  // Search & Filter
  searchAccount: "Search account name...",
  searchModel: "Search model...",
  selectModel: "Select model...",

  // Buttons
  addAccount: "+",
  addModel: "+",
  addAccountTitle: "Add Account",
  addModelTitle: "Add Model",
  refresh: "Reload All Models",
  edit: "Edit",
  delete: "Delete",
  enable: "Enable",
  disable: "Disable",
  claude: "Claude",

  // Form Labels
  name: "Name",
  namePlaceholder: "Account name",
  modelId: "Model ID",
  provider: "For",
  providerChat: "Chat",
  providerClaude: "Claude",
  providerCodex: "Codex",
  providerGemini: "Gemini",
  assModelIds: "Associated Models",
  modelEnabled: "Enable Model",
  customMode: "Custom",
  customModelIdPlaceholder: "Supports wildcards and multiple IDs, e.g: deepseek*, glm-4 (comma separated)",
  customModeOnly: "In custom mode, only custom option can be selected",
  customModeRequired: "Custom model ID is required in custom mode",
  assModelIdsRequired: "Please select at least one associated model or use custom mode",
  assModelIdsConflict: "Cannot select both custom and other models",
  baseURL: "Base URL",
  baseURLPlaceholder: "https://api.example.com",
  baseURLError: "URL must start with http:// or https://",
  apiKey: "API Key",
  apiKeyPlaceholder: "sk-...",
  claudeAvailable: "Claude Available",
  extInfo: "Extended Info",
  extInfoPlaceholder: "Optional extended information",
  selectAll: "Select All",

  // Form Actions
  saveAccount: "Save Account",
  saveModel: "Save Model",
  editAccountTitle: "Edit Account",
  editModelTitle: "Edit Model",
  updateAccount: "Update Account",
  updateModel: "Update Model",

  // Status
  active: "Active",
  inactive: "Inactive",
  enabled: "Enabled",
  disabled: "Disabled",
  unknown: "Unknown",

  // Card Labels
  lastUpdated: "Last Updated",
  updatedAt: "Updated At",

  // Model Card
  noModels: "No model data",
  noOtherModels: "No other models to associate",
  loadModelsError: "Failed to load model list",
  none: "None",

  // Time Relative
  neverUpdated: "Never updated",
  justNow: "Just now",
  minutesAgo: "${minutes} minutes ago",
  hoursAgo: "${hours} hours ago",
  daysAgo: "${days} days ago",

  // Toast Messages
  loadFailed: "Load failed",
  loadAccountFailed: "Failed to load account:",
  loadModelFailed: "Failed to load model:",
  createFailed: "Failed to create",
  createSuccess: "Created successfully!",
  createAccountFailed: "Failed to create account: ${error}",
  createModelFailed: "Failed to create model: ${error}",
  updateFailed: "Failed to update",
  updateSuccess: "Updated successfully!",
  updateAccountFailed: "Failed to update account: ${error}",
  updateModelFailed: "Failed to update model: ${error}",
  deleteSuccess: "Deleted successfully!",
  deleteFailed: "Failed to delete",
  deleteAccountFailed: "Failed to delete account: ${error}",
  deleteModelFailed: "Failed to delete model: ${error}",
  toggleFailed: "Failed to toggle status",
  toggleStatusFailed: "Failed to toggle status: ${error}",
  actionSuccess: "${item} ${action} successfully!",

  // Copy
  copied: "Copied!",
  copiedToClipboard: "Copied to clipboard",
  copyFailed: "Copy failed",

  // Pagination
  previous: "Previous",
  next: "Next",
  pageInfo: "Page ${currentPage} of ${totalPages}, ${totalItems} total",

  // Loading
  loading: "Loading...",
  refreshing: "Refreshing...",

  // Model Selection
  noMatchingModels: "No matching models found",
  refreshTriggered: "Cache refresh triggered, reloading...",
  refreshFailed: "Refresh failed",

  // Error Messages
  invalidURL: "Invalid URL",
  loadModelsFailed: "Failed to load models",
  loadFailedRetry: "Load failed, please try again",
  selectModelFirst: "Please select a model first",
  noAccountsFound: "No accounts found supporting this model",
  loadingData: "Loading data...",
};

// Register translation - wait for i18n module
function registerEnTranslation() {
    if (window.i18n && window.i18n.addTranslation) {
        window.i18n.addTranslation('en', enUS);
    } else {
        setTimeout(registerEnTranslation, 10);
    }
}
registerEnTranslation();
