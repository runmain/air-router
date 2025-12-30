// Chinese Simplified translations
const zhCN = {
  // Page Titles
  accountManagement: "账户管理",
  debugPage: "调试",

  // Confirmation Dialog
  confirm: "确认",
  confirmDelete: "确定要执行此操作吗？",
  confirmDeleteAccount: "确定要删除此账户吗？",
  cancel: "取消",
  ok: "确定",

  // Search & Filter
  searchAccount: "搜索账户名称...",
  searchModel: "搜索模型...",
  selectModel: "选择模型...",

  // Buttons
  addAccount: "+ 添加账户",
  addAccountTitle: "添加账户",
  refresh: "重新加载",
  edit: "编辑",
  delete: "删除",
  enable: "启用",
  disable: "禁用",

  // Form Labels
  name: "名称",
  namePlaceholder: "账户名称",
  baseURL: "基础URL",
  baseURLPlaceholder: "https://api.example.com",
  baseURLError: "URL必须以http://或https://开头",
  apiKey: "API密钥",
  apiKeyPlaceholder: "sk-...",
  extInfo: "扩展信息",
  extInfoPlaceholder: "可选的扩展信息",

  // Form Actions
  saveAccount: "保存账户",
  editAccountTitle: "编辑账户",
  updateAccount: "更新账户",

  // Status
  active: "活跃",
  inactive: "未激活",
  unknown: "Unknown",

  // Card Labels
  lastUpdated: "最后更新",

  // Time Relative
  neverUpdated: "从未更新",
  justNow: "刚刚",
  minutesAgo: "${minutes}分钟前",
  hoursAgo: "${hours}小时前",
  daysAgo: "${days}天前",

  // Toast Messages
  loadFailed: "加载失败",
  loadAccountFailed: "加载账户失败:",
  createFailed: "创建账户失败",
  createSuccess: "账户创建成功！",
  createAccountFailed: "创建账户失败:",
  updateFailed: "更新账户失败",
  updateSuccess: "账户更新成功！",
  updateAccountFailed: "更新账户失败:",
  deleteSuccess: "账户删除成功！",
  deleteFailed: "删除账户失败",
  deleteAccountFailed: "删除账户失败:",
  toggleFailed: "切换账户状态失败",
  toggleStatusFailed: "切换账户状态失败:",
  actionSuccess: "账户${action}成功！",

  // Copy
  copied: "已复制",
  copiedToClipboard: "已复制到剪贴板",
  copyFailed: "复制失败",

  // Pagination
  previous: "上一页",
  next: "下一页",
  pageInfo: "第 ${currentPage} / ${totalPages} 页，共 ${totalItems} 条",

  // Loading
  loading: "加载中...",
  refreshing: "刷新中...",

  // Model Selection
  noMatchingModels: "未找到匹配的模型",
  refreshTriggered: "缓存刷新已触发，正在重新加载...",
  refreshFailed: "刷新失败",

  // Error Messages
  invalidURL: "无效的URL",
  loadModelsFailed: "加载模型失败",
  loadFailedRetry: "加载失败，请重试",
  selectModelFirst: "请先选择模型",
  noAccountsFound: "未找到支持此模型的账户",
  loadingData: "数据加载中...",
};

// Register translation - wait for i18n module
function registerZhTranslation() {
    if (window.i18n && window.i18n.addTranslation) {
        window.i18n.addTranslation('zh', zhCN);
    } else {
        setTimeout(registerZhTranslation, 10);
    }
}
registerZhTranslation();