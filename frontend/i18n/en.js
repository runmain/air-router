// English translations
const enUS = {
  // Page Titles
  accountManagement: "Account Management",
  debugPage: "Debug Info",

  // Confirmation Dialog
  confirm: "Confirm",
  confirmDelete: "Are you sure you want to perform this operation?",
  confirmDeleteAccount: "Are you sure you want to delete this account?",
  cancel: "Cancel",
  ok: "OK",

  // Search & Filter
  searchAccount: "Search account name...",
  searchModel: "Search model...",
  selectModel: "Select model...",

  // Buttons
  addAccount: "+ Add Account",
  addAccountTitle: "Add Account",
  refresh: "Reload All Models",
  edit: "Edit",
  delete: "Delete",
  enable: "Enable",
  disable: "Disable",

  // Form Labels
  name: "Name",
  namePlaceholder: "Account name",
  baseURL: "Base URL",
  baseURLPlaceholder: "https://api.example.com",
  baseURLError: "URL must start with http:// or https://",
  apiKey: "API Key",
  apiKeyPlaceholder: "sk-...",
  extInfo: "Extended Info",
  extInfoPlaceholder: "Optional extended information",

  // Form Actions
  saveAccount: "Save Account",
  editAccountTitle: "Edit Account",
  updateAccount: "Update Account",

  // Status
  active: "Active",
  inactive: "Inactive",
  unknown: "Unknown",

  // Card Labels
  lastUpdated: "Last Updated",

  // Time Relative
  neverUpdated: "Never updated",
  justNow: "Just now",
  minutesAgo: "${minutes} minutes ago",
  hoursAgo: "${hours} hours ago",
  daysAgo: "${days} days ago",

  // Toast Messages
  loadFailed: "Load failed",
  loadAccountFailed: "Failed to load account:",
  createFailed: "Failed to create account",
  createSuccess: "Account created successfully!",
  createAccountFailed: "Failed to create account:",
  updateFailed: "Failed to update account",
  updateSuccess: "Account updated successfully!",
  updateAccountFailed: "Failed to update account:",
  deleteSuccess: "Account deleted successfully!",
  deleteFailed: "Failed to delete account",
  deleteAccountFailed: "Failed to delete account:",
  toggleFailed: "Failed to toggle account status",
  toggleStatusFailed: "Failed to toggle account status:",
  actionSuccess: "Account ${action} successfully!",

  // Copy
  copied: "Copied",
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