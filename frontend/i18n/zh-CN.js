// Chinese Simplified translations
const zhCN = {
  // Page Titles
  accountManagement: "账户管理",
  debugPage: "调试",

  // Tabs
  tabAccounts: "供应商",
  tabAllInOne: "模型",
  allInOneContent: "模型管理",

  // Confirmation Dialog
  confirm: "确认",
  confirmDelete: "确定要执行此操作吗？",
  confirmDeleteAccount: "确定要删除此账户吗？",
  confirmDeleteModel: "确定要删除此模型吗？",
  cancel: "取消",
  ok: "确定",

  // Search & Filter
  searchAccount: "搜索账户名称...",
  searchModel: "搜索模型...",
  selectModel: "选择模型...",

  // Buttons
  addAccount: "+",
  addModel: "+",
  addAccountTitle: "添加账户",
  addModelTitle: "添加模型",
  refresh: "重新加载",
  edit: "编辑",
  delete: "删除",
  enable: "启用",
  disable: "禁用",
  claude: "Claude",

  // Form Labels
  name: "名称",
  namePlaceholder: "账户名称",
  modelId: "模型ID",
  provider: "提供商",
  providerChat: "Chat",
  providerClaude: "Claude",
  providerCodex: "Codex",
  providerGemini: "Gemini",
  assModelIds: "关联模型",
  modelEnabled: "启用模型",
  customMode: "自定义",
  customModelIdPlaceholder: "支持通配符和多个ID，如: deepseek*, glm-4 (逗号分隔)",
  customModeOnly: "自定义模式下只能选择自定义选项",
  customModeRequired: "自定义模式下必须输入模型ID",
  assModelIdsRequired: "请至少选择一个关联模型或使用自定义模式",
  assModelIdsConflict: "不能同时选择自定义和其他模型",
  baseURL: "基础URL",
  baseURLPlaceholder: "https://api.example.com",
  baseURLError: "URL必须以http://或https://开头",
  apiKey: "API密钥",
  apiKeyPlaceholder: "sk-...",
  claudeAvailable: "Claude可用",
  extInfo: "扩展信息",
  extInfoPlaceholder: "可选的扩展信息",
  selectAll: "全选",

  // Form Actions
  saveAccount: "保存账户",
  saveModel: "保存模型",
  editAccountTitle: "编辑账户",
  editModelTitle: "编辑模型",
  updateAccount: "更新账户",
  updateModel: "更新模型",

  // Status
  active: "活跃",
  inactive: "未激活",
  enabled: "已启用",
  disabled: "已禁用",
  unknown: "Unknown",

  // Card Labels
  lastUpdated: "最后更新",
  updatedAt: "更新时间",

  // Model Card
  noModels: "暂无模型数据",
  noOtherModels: "没有其他模型可关联",
  loadModelsError: "加载模型列表失败",
  none: "无",

  // Time Relative
  neverUpdated: "从未更新",
  justNow: "刚刚",
  minutesAgo: "${minutes}分钟前",
  hoursAgo: "${hours}小时前",
  daysAgo: "${days}天前",

  // Toast Messages
  loadFailed: "加载失败",
  loadAccountFailed: "加载账户失败:",
  loadModelFailed: "加载模型失败:",
  createFailed: "创建失败",
  createSuccess: "创建成功！",
  createAccountFailed: "创建账户失败: ${error}",
  createModelFailed: "创建模型失败: ${error}",
  updateFailed: "更新失败",
  updateSuccess: "更新成功！",
  updateAccountFailed: "更新账户失败: ${error}",
  updateModelFailed: "更新模型失败: ${error}",
  deleteSuccess: "删除成功！",
  deleteFailed: "删除失败",
  deleteAccountFailed: "删除账户失败: ${error}",
  deleteModelFailed: "删除模型失败: ${error}",
  toggleFailed: "切换状态失败",
  toggleStatusFailed: "切换状态失败: ${error}",
  actionSuccess: "${item}${action}成功！",

  // Copy
  copied: "已复制！",
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

  // Card Flip
  viewModels: "点击查看模型",
  availableModels: "可用模型",
  noModelsAvailable: "暂无可用模型",
  totalModels: "共 ${count} 个模型",
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
