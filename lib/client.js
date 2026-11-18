/**
 * Client half of the TAPD task view.
 *
 * Registers a sidebar icon plus a `main` panel (`key: 'task-hub'`) that lists
 * the stories assigned to the configured TAPD owner and dispatches an agent by
 * POSTing to the host routes this bundle registers.
 */
window.__ModuleLoader__.load({
  id: 'dsh-task-hub',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-task-hub'
    const PANEL_ID = 'task-hub'
    const POLL_MS = 60_000
    const SYNC_MS = 90_000
    const LIST_VIEW_ENABLED = false

    const zh = {
      nav: '任务中心',
      title: '任务中心',
      subtitle: '分配给我的任务',
      taskFilters: '任务筛选',
      providerAll: '全部来源',
      boardView: '看板',
      listView: '列表',
      search: '搜索',
      taskSearch: '任务号、父需求号或标题',
      allProjects: '全部项目 / 产品',
      allApps: '全部应用',
      unknownStatus: '未提供状态',
      syncFailed: '刷新失败，保留上次结果',
      noMatches: '试试其他关键词或筛选条件。',
      chooseConversation: '派发到',
      newConversation: '新开对话',
      existingConversation: '继续原对话',
      prepareExisting: '继续对话',
      prepareNew: '新开对话',
      reuseCheckout: '需求分支',
      draftOnly: '草稿由你确认后发送',
      extraPromptPlaceholder: '补充本次要做的事',
      draftWaiting: '待发送',
      statusUnavailable: '状态暂不可用',
      draftIncomplete: '草稿未就绪',
      retryDraft: '重试草稿',
      existingDraftPreserved: '已保留原输入框内容。处理完后可再次准备任务草稿。',
      allowQueryAuth: '兼容旧版 TAPD 查询参数认证',
      queryAuthHint: '仅在旧版网关要求时开启，启用后可能在请求 URL 中携带 API 密码。',
      provider: '需求来源',
      providerTapd: 'TAPD',
      providerZentao: '禅道',
      providerHint: '选择要配置的来源。任务面板可同时查看 TAPD 和禅道。',
      refresh: '刷新',
      settings: '设置',
      save: '保存',
      saving: '保存中…',
      cancel: '取消',
      close: '关闭',
      retry: '重试',
      empty: '没有找到任务',
      emptyHint: '检查来源配置（项目、产品或账号）与处理人后重试。',
      needSetup: '还差一步配置',
      needSetupHint: '打开设置，选择需求来源并填写地址、账号与凭据，保存后就能看到分配给我的任务。',
      goSettings: '去设置',
      loading: '正在读取…',
      filterAll: '全部',
      filterOpen: '进行中',
      filterDone: '已完成',
      dispatch: '派发 Agent',
      openSession: '打开会话',
      openShort: '打开',
      dispatchTitle: '派发 Agent',
      dispatchTarget: '目标工作区',
      dispatchCustom: '自定义仓库路径…',
      dispatchWorktree: '使用独立 worktree',
      dispatchWorktreeHint: '在仓库同级 .dsh-worktrees 下新建检出，避免打断你当前的分支。',
      dispatchBase: '基础分支',
      dispatchBaseHint: '留空则自动选择 origin/HEAD 或当前分支。',
      dispatchPrompt: '补充要求（可选）',
      dispatchConfirm: '建分支并放进输入框',
      dispatching: '正在派发…',
      dispatched: '已派发',
      draftReady: '已放进输入框，确认后自行发送',
      draftFailed: '会话已建好，但内容没能放进输入框，请打开会话手动粘贴。',
      draftPartial: '会话已建好，{n} 个附件没能放进输入框，请手动补上。',
      draftOpened: '已打开该任务的草稿会话，正文在输入框里。发出第一条消息前，侧栏会把它显示为「新会话」。',
      draftOpenedWithAttachments: '已打开该任务的草稿会话，正文和 {n} 个附件都在输入框里。发出第一条消息前，侧栏会把它显示为「新会话」。',
      draftAlreadySent: '该会话已经发过消息，草稿没有再放进输入框；需求内容仍在会话里。',
      draftWaitingHint: '会话已建好但还没发出第一条消息，左侧列表里显示为「新会话」。',
      running: '运行中',
      idle: '空闲',
      story: '需求',
      owner: '处理人',
      due: '截止',
      app: '应用',
      priority: '优先级',
      status: '状态',
      iteration: '迭代',
      detail: '需求详情',
      detailLoading: '正在读取完整需求…',
      detailFailed: '完整需求读取失败，以下为列表中的数据。',
      syncRequirement: '同步需求',
      syncingRequirement: '同步中…',
      requirementSynced: '已同步最新需求',
      requirementPartiallySynced: '已同步需求，部分内容读取失败',
      requirementSyncFailed: '同步失败，已保留上次读取的需求',
      requirementInfo: '详细信息',
      basicInfo: '基础信息',
      noDescription: '暂无需求描述',
      attachments: '附件',
      noAttachments: '暂无附件',
      comments: '评论',
      noComments: '暂无评论',
      detailRestartHint: '宿主插件还没加载这个接口，请完全退出并重新打开 DSH 后再试。',
      imageUnavailable: '图片暂无法显示，请打开原需求查看。',
      previewImage: '查看大图',
      retry: '重新读取',
      openSource: '打开原需求',
      id: 'ID',
      module: '模块',
      developer: '开发人员',
      begin: '预计开始',
      end: '预计结束',
      effort: '预计工时',
      cc: '抄送人',
      creator: '创建人',
      created: '创建时间',
      modified: '最后修改',
      completed: '完成时间',
      parent: '父需求',
      source: '来源',
      projects: 'TAPD 项目 ID',
      projectsHint: '多个用逗号分隔，例如 10058231。',
      apiUser: 'TAPD API 账号',
      apiPassword: 'TAPD API 密码',
      passwordSaved: '已配置，留空表示不修改',
      passwordMissing: '未配置',
      ownerName: '处理人昵称（owner）',
      ownerNameHint: 'TAPD 上你的显示名，用于 owner 过滤。',
      defaultWorkspace: '默认工作区',
      baseBranch: '默认基础分支',
      zentaoBaseUrl: '禅道地址',
      zentaoBaseUrlHint: '例如 https://zentao.example.com，会自动补 /api.php/v1。',
      zentaoBasicHint: '填写 Apache 或 Nginx 的 HTTP 访问凭据。下方仍需填写禅道登录账号和密码。',
      zentaoBasicAccount: '网关账号',
      zentaoBasicPassword: '网关密码',
      zentaoAccount: '禅道账号',
      zentaoPassword: '禅道密码',
      zentaoPasswordSaved: '密码已配置，留空表示不修改',
      zentaoPasswordMissing: '未配置密码',
      zentaoScope: '读取范围',
      zentaoScopeProduct: '产品需求',
      zentaoType_story: '研发需求',
      zentaoType_requirement: '用户需求',
      zentaoType_epic: '业务需求',
      zentaoScopeProject: '项目任务',
      zentaoProductId: '产品 ID',
      zentaoProjectId: '项目 ID',
      zentaoContainerHint: '读取列表后可勾选多个，也可以直接填写 ID，用逗号分隔。',
      zentaoFetchProducts: '读取产品',
      zentaoFetchProjects: '读取项目',
      zentaoFetchingContainers: '正在读取…',
      zentaoNoProducts: '没有可选的产品',
      zentaoNoProjects: '没有可选的项目',
      zentaoContainerRequired: '请选择禅道产品/项目',
      dispatchBranch: '分支名称',
      dispatchBranchHint: '自己填写完整分支名，例如 feature/order-export；不会再自动拼接需求编号。',
      dispatchBranchRequiredTag: '必填',
      dispatchBranchRequired: '请先填写完整的分支名称',
      excludeCompleted: '默认只显示未完成任务',
      saveDone: '已保存',
      dispatchDone: '已派发，正在打开会话…',
      viewTAPD: '在 TAPD 打开',
      errorGeneric: '出错了',
      zentaoUnassignedHint: '禅道返回了条目，但所选范围内没有指派给当前禅道账号的条目。请核对禅道的「指派给」和插件设置中的禅道账号。',
      credentialsConfigured: '凭据已配置',
      credentialsMissing: '凭据未配置',
      noWorkspace: '没有可选工作区，请填一个仓库路径。',
      branch: '分支',
      dataDir: '数据目录',
      noSession: '会话已不在',
      redispatch: '重新派发',
      sessionGoneHint: '关联的会话已被删除，可以重新派发一个。',
      openFailed: '打开会话失败，请稍后重试，或在左侧会话列表里手动打开。',
      openUnavailable: '当前界面没有提供会话导航能力，请在左侧会话列表里手动打开。',
      smartCheckout: '智能保留本地改动（Smart Checkout）',
      smartCheckoutHint:
        '自动备份并保留未提交、未跟踪和被忽略的本地文件；恢复冲突或无法安全切换时直接中止，不会 clean 或 reset --hard。',
      dispatchedWithAttachments: '已派发，附带 {n} 个附件，正在打开会话…',
      assetsAdded: '已把需求附件与截图补充到现有会话，正在打开…',
      backfill: '补发附件',
      refreshDraft: '补齐草稿',
      refreshDraftHint: '重新读取禅道正文和图片，补入原会话的草稿',
      refreshDraftPreserved: '已保存补齐后的草稿。当前输入框有内容，请先备份并清空，再从任务中心点「打开」。',
      refreshDraftStarted: '原会话已发送过消息，请在会话中手动补充需求内容。',
      backfillHint: '把这条需求的附件与截图补充到现有会话',
      backfilling: '补发中…',
      assetsUpToDate: '这条需求的附件已是最新，无需补发',
      projectCount: '个项目',
      lastRefresh: '刷新于',
      authMode: '凭证方式',
      authToken: '个人访问令牌',
      authBasic: 'API 账号',
      tokenLabel: 'TAPD 个人访问令牌',
      tokenHint: 'TAPD「我的设置 → 个人访问令牌」里创建，保存后只显示是否已配置。',
      tokenSaved: '令牌已配置，留空表示不修改',
      tokenMissing: '未配置令牌',
      basicUserLabel: 'TAPD API 账号',
      basicPasswordLabel: 'TAPD API 密码',
      basicPasswordSaved: '密码已配置，留空表示不修改',
      basicPasswordMissing: '未配置密码',
      nickLabel: 'TAPD 昵称（nick）',
      nickHint: '通常是邮箱 @ 前面的部分，用来列出你参与的项目。',
      fetchProjects: '获取我参与的项目',
      fetchingProjects: '正在读取项目…',
      projectsTitle: 'TAPD 项目',
      projectsPickerHint: '仅显示你参与的项目，勾选后保存。',
      projectsManual: '也可以直接填项目 ID（逗号分隔）',
      noProjects: '没有读取到项目，检查令牌和昵称',
      projectSelected: '已选',
      iterationUnknown: '未规划迭代/里程碑',
      storyColumn: '需求',
      statusColumn: '状态',
      ownerColumn: '处理人',
      actionColumn: '操作',
      openTAPD: '在来源系统打开',
      dispatchedTo: '已派发到',
      storyCount: '条需求',
      pickProjectsFirst: '先获取并勾选至少一个项目。',
      projectsOk: '已读取',
      projectsUnit: '个项目',
    }

    const en = {
      nav: 'Task Hub',
      title: 'Task Hub',
      subtitle: 'Tasks assigned to me',
      taskFilters: 'Task filters',
      providerAll: 'All sources',
      boardView: 'Board',
      listView: 'List',
      search: 'Search',
      taskSearch: 'Task ID, parent ID, or title',
      allProjects: 'All projects / products',
      allApps: 'All applications',
      unknownStatus: 'No status',
      syncFailed: 'Refresh failed. Showing the last result.',
      noMatches: 'Try a different search or filter.',
      chooseConversation: 'Dispatch to',
      newConversation: 'New conversation',
      existingConversation: 'Continue conversation',
      prepareExisting: 'Continue',
      prepareNew: 'Open new conversation',
      reuseCheckout: 'Task branch',
      draftOnly: 'Review the draft before sending',
      extraPromptPlaceholder: 'Add instructions for this conversation',
      draftWaiting: 'Ready to send',
      statusUnavailable: 'Status unavailable',
      draftIncomplete: 'Draft incomplete',
      retryDraft: 'Retry draft',
      existingDraftPreserved: 'Your composer content was kept. Prepare the task draft again when ready.',
      allowQueryAuth: 'Allow legacy TAPD query authentication',
      queryAuthHint: 'Enable only for legacy gateways that require it. The request URL may carry the API password.',
      provider: 'Source',
      providerTapd: 'TAPD',
      providerZentao: 'ZenTao',
      providerHint: 'Choose a source to configure. The task view can show TAPD and ZenTao together.',
      refresh: 'Refresh',
      settings: 'Settings',
      save: 'Save',
      saving: 'Saving…',
      cancel: 'Cancel',
      close: 'Close',
      retry: 'Retry',
      empty: 'No tasks found',
      emptyHint: 'Check the source configuration (projects, products or owner), then retry.',
      needSetup: 'One more step',
      needSetupHint: 'Open settings, pick a source and fill in its URL, account and credentials.',
      goSettings: 'Open settings',
      loading: 'Loading…',
      filterAll: 'All',
      filterOpen: 'Open',
      filterDone: 'Done',
      dispatch: 'Dispatch agent',
      openSession: 'Open session',
      openShort: 'Open',
      dispatchTitle: 'Dispatch agent',
      dispatchTarget: 'Target workspace',
      dispatchCustom: 'Custom repository path…',
      dispatchWorktree: 'Use a separate worktree',
      dispatchWorktreeHint: 'Checks out under .dsh-worktrees beside the repo so your current branch stays untouched.',
      dispatchBase: 'Base branch',
      dispatchBaseHint: 'Leave empty to pick origin/HEAD or the current branch.',
      dispatchPrompt: 'Extra instructions (optional)',
      dispatchConfirm: 'Create branch and prefill',
      dispatching: 'Dispatching…',
      dispatched: 'Dispatched',
      draftReady: 'Loaded into the composer — send it yourself when ready',
      draftFailed: 'The session is ready, but the text could not be placed in the composer; paste it manually.',
      draftPartial: 'The session is ready, but {n} attachment(s) could not be placed in the composer.',
      draftOpened: 'Draft session opened — the brief is in the composer. The sidebar shows it as a new session until its first message.',
      draftOpenedWithAttachments: 'Draft session opened — the brief and {n} attachment(s) are in the composer. The sidebar shows it as a new session until its first message.',
      draftAlreadySent: 'This session already has messages, so the draft was not pushed into its composer again.',
      draftWaitingHint: 'The session exists but has no first message yet, so the sidebar lists it as a new session.',
      running: 'Running',
      idle: 'Idle',
      story: 'Story',
      owner: 'Owner',
      due: 'Due',
      app: 'App',
      priority: 'Priority',
      status: 'Status',
      iteration: 'Iteration',
      detail: 'Requirement',
      detailLoading: 'Loading the full requirement…',
      detailFailed: 'The full requirement could not be read; showing the list data.',
      syncRequirement: 'Sync requirement',
      syncingRequirement: 'Syncing…',
      requirementSynced: 'Requirement synced',
      requirementPartiallySynced: 'Requirement synced. Some content could not be loaded.',
      requirementSyncFailed: 'Sync failed. Showing the last loaded requirement.',
      requirementInfo: 'Description',
      basicInfo: 'Basic information',
      noDescription: 'The source did not provide a description.',
      attachments: 'Attachments',
      noAttachments: 'The source did not provide attachments.',
      comments: 'Comments',
      noComments: 'The source did not provide comments.',
      detailRestartHint: 'The host plugin has not loaded this route yet. Fully quit and reopen DSH.',
      imageUnavailable: 'Open the original requirement to view this image.',
      previewImage: 'View full image',
      retry: 'Retry',
      openSource: 'Open in source',
      id: 'ID',
      module: 'Module',
      developer: 'Developers',
      begin: 'Planned start',
      end: 'Planned end',
      effort: 'Estimated hours',
      cc: 'CC',
      creator: 'Creator',
      created: 'Created',
      modified: 'Last modified',
      completed: 'Completed',
      parent: 'Parent',
      source: 'Source',
      projects: 'TAPD project ids',
      projectsHint: 'Comma separated, for example 10058231.',
      apiUser: 'TAPD API user',
      apiPassword: 'TAPD API password',
      passwordSaved: 'Configured; leave empty to keep it',
      passwordMissing: 'Not configured',
      ownerName: 'Owner nickname (owner)',
      ownerNameHint: 'Your display name in TAPD, used for the owner filter.',
      defaultWorkspace: 'Default workspace',
      baseBranch: 'Default base branch',
      zentaoBaseUrl: 'ZenTao URL',
      zentaoBaseUrlHint: 'For example https://zentao.example.com; /api.php/v1 is added automatically.',
      zentaoBasicHint: 'Enter the HTTP credentials for Apache or Nginx. Enter your ZenTao login separately below.',
      zentaoBasicAccount: 'Gateway username',
      zentaoBasicPassword: 'Gateway password',
      zentaoAccount: 'ZenTao account',
      zentaoPassword: 'ZenTao password',
      zentaoPasswordSaved: 'Password configured — leave empty to keep it',
      zentaoPasswordMissing: 'No password configured',
      zentaoScope: 'Read from',
      zentaoScopeProduct: 'Product stories',
      zentaoType_story: 'Development requirement',
      zentaoType_requirement: 'User requirement',
      zentaoType_epic: 'Business requirement',
      zentaoScopeProject: 'Project tasks',
      zentaoProductId: 'Product ID',
      zentaoProjectId: 'Project ID',
      zentaoContainerHint: 'Load the list to select multiple items, or enter comma-separated IDs.',
      zentaoFetchProducts: 'Load products',
      zentaoFetchProjects: 'Load projects',
      zentaoFetchingContainers: 'Loading…',
      zentaoNoProducts: 'No products available',
      zentaoNoProjects: 'No projects available',
      zentaoContainerRequired: 'Pick a ZenTao product/project',
      dispatchBranch: 'Branch name',
      dispatchBranchHint: 'Type the full branch name yourself, e.g. feature/order-export; the story id is never appended.',
      dispatchBranchRequiredTag: 'Required',
      dispatchBranchRequired: 'Enter the full branch name first',
      excludeCompleted: 'Show open tasks by default',
      saveDone: 'Saved',
      dispatchDone: 'Dispatched; opening the session…',
      viewTAPD: 'Open in TAPD',
      errorGeneric: 'Something went wrong',
      zentaoUnassignedHint: 'ZenTao returned items in this scope, but none are assigned to the current account. Check “Assigned to” in ZenTao and the account in plugin settings.',
      credentialsConfigured: 'Credentials configured',
      credentialsMissing: 'Credentials missing',
      noWorkspace: 'No workspace available; enter a repository path.',
      branch: 'Branch',
      dataDir: 'Data directory',
      noSession: 'Session is gone',
      redispatch: 'Dispatch again',
      sessionGoneHint: 'The linked session was deleted; you can dispatch a fresh one.',
      openFailed: 'Could not open the session. Retry, or open it from the sidebar.',
      openUnavailable: 'Session navigation is unavailable here; open it from the sidebar.',
      smartCheckout: 'Preserve local changes (Smart Checkout)',
      smartCheckoutHint:
        'Backs up and keeps uncommitted, untracked, and ignored local files; stops on restore conflicts instead of running clean or reset --hard.',
      dispatchedWithAttachments: 'Dispatched with {n} attachment(s); opening the session…',
      assetsAdded: 'Added the requirement attachments and screenshots to the existing session; opening…',
      backfill: 'Add assets',
      refreshDraft: 'Complete draft',
      refreshDraftHint: 'Load the ZenTao description and images into the existing session draft',
      refreshDraftPreserved: 'The refreshed draft is saved. Back up and clear the current composer, then reopen from Task Hub.',
      refreshDraftStarted: 'The session has already started. Add the missing requirement content in the session.',
      backfillHint: 'Send this requirement’s files and screenshots to the existing session',
      backfilling: 'Adding…',
      assetsUpToDate: 'This requirement’s assets are already up to date',
      projectCount: 'project(s)',
      lastRefresh: 'Updated',
      authMode: 'Credential',
      authToken: 'Personal token',
      authBasic: 'API account',
      tokenLabel: 'TAPD personal access token',
      tokenHint: 'Create one under TAPD "My settings → Personal access token". Only the configured flag is shown after saving.',
      tokenSaved: 'Token configured — leave empty to keep it',
      tokenMissing: 'No token configured',
      basicUserLabel: 'TAPD API user',
      basicPasswordLabel: 'TAPD API password',
      basicPasswordSaved: 'Password configured — leave empty to keep it',
      basicPasswordMissing: 'No password configured',
      nickLabel: 'TAPD nick',
      nickHint: 'Usually the part before @ in your email; used to list the projects you joined.',
      fetchProjects: 'Load my projects',
      fetchingProjects: 'Loading projects…',
      projectsTitle: 'TAPD projects',
      projectsPickerHint: 'Only projects you participate in are listed; tick the ones to use.',
      projectsManual: 'Or type project ids (comma separated)',
      noProjects: 'No projects returned — check the token and nick',
      projectSelected: 'selected',
      iterationUnknown: 'No iteration/milestone',
      storyColumn: 'Requirement',
      statusColumn: 'Status',
      ownerColumn: 'Owner',
      actionColumn: 'Actions',
      openTAPD: 'Open in source system',
      dispatchedTo: 'Dispatched to',
      storyCount: 'stories',
      pickProjectsFirst: 'Load and tick at least one project first.',
      projectsOk: 'Loaded',
      projectsUnit: 'projects',
    }

    const STYLE_ID = 'dsh-task-hub-styles'
    const CSS = `
.tt-root {
  --tt-canvas: var(--dsw-alias-bg-base, #f5f5f7);
  --tt-surface: var(--dsw-alias-bg-layer-1, #fff);
  --tt-text: var(--dsw-alias-label-primary, #1d1d1f);
  --tt-secondary: var(--dsw-alias-label-secondary, #62626a);
  --tt-fill: color-mix(in srgb, var(--tt-text) 5%, var(--tt-surface));
  --tt-line: color-mix(in srgb, var(--tt-text) 9%, var(--tt-surface));
  --tt-accent: #0066d6;
  --tt-accent-hover: #0058be;
  --tt-tint: color-mix(in srgb, #007aff 10%, var(--tt-surface));
  --tt-link: color-mix(in srgb, #007aff 68%, var(--tt-text));
  --tt-ring: color-mix(in srgb, #007aff 35%, transparent);
  --tt-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 16px rgb(0 0 0 / 3%);
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  padding: 20px clamp(12px, 1vw, 20px) 24px;
  background: color-mix(in srgb, var(--tt-text) 3%, var(--tt-canvas));
  color: var(--tt-text);
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  container: tt-panel / inline-size;
}
.tt-shell { width: 100%; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.tt-head { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px; }
.tt-head-main { display: flex; align-items: center; gap: 13px; flex: 1 1 240px; min-width: 0; }
.tt-head-mark { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; background: var(--tt-tint); color: var(--tt-link); }
.tt-head-copy { min-width: 0; }
.tt-title { margin: 0; font-size: 26px; line-height: 1.2; font-weight: 650; letter-spacing: -.025em; }
.tt-sub { margin-top: 4px; font-size: 12px; color: var(--tt-secondary); overflow-wrap: anywhere; }
.tt-head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tt-root button { font-family: inherit; }
.tt-btn { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--tt-line); background: var(--tt-surface); color: var(--tt-text); border-radius: 8px; min-height: 32px; padding: 5px 12px; font-size: 12px; font-weight: 550; line-height: 1.35; white-space: nowrap; cursor: pointer; }
.tt-btn:hover:not(:disabled) { background: var(--tt-fill); }
.tt-btn:disabled, .tt-tab:disabled { opacity: .55; cursor: default; }
.tt-btn-primary { background: var(--tt-accent); border-color: transparent; color: #fff; }
.tt-btn-primary:hover:not(:disabled) { background: var(--tt-accent-hover); }
.tt-btn-small { min-height: 27px; padding: 4px 9px; font-size: 11.5px; }
.tt-root :is(button, a, input[type="checkbox"]):focus-visible { outline: 2px solid var(--tt-accent); outline-offset: 2px; }
.tt-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tt-tabs { display: inline-flex; align-items: center; gap: 2px; flex-wrap: wrap; align-self: flex-start; }
.tt-sources { padding: 3px; border-radius: 10px; border: 1px solid var(--tt-line); background: var(--tt-fill); }
.tt-tab { appearance: none; border: 1px solid transparent; background: transparent; color: var(--tt-secondary); border-radius: 7px; min-height: 29px; padding: 3px 12px; font-size: 12px; font-weight: 550; line-height: 1.45; white-space: nowrap; cursor: pointer; }
.tt-tab:hover:not(:disabled) { color: var(--tt-text); background: var(--tt-fill); }
.tt-sources .tt-tab { min-width: 63px; }
.tt-sources .tt-tab-on, .tt-sources .tt-tab-on:hover:not(:disabled) { background: var(--tt-surface); color: var(--tt-text); border-color: var(--tt-line); box-shadow: 0 1px 3px rgb(0 0 0 / 10%); }
.tt-filters { gap: 4px; }
.tt-filters .tt-tab-on, .tt-filters .tt-tab-on:hover:not(:disabled) { background: var(--tt-tint); color: var(--tt-link); }
.tt-tab-total { margin-inline-start: 5px; font-size: 11px; font-variant-numeric: tabular-nums; opacity: .85; }
.tt-count { font-size: 11.5px; color: var(--tt-secondary); margin-inline-start: auto; font-variant-numeric: tabular-nums; }
.tt-list { display: flex; flex-direction: column; gap: 14px; }
.tt-search-control { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
.tt-search-control .tt-search { width: clamp(160px, 30cqw, 220px); max-width: 100%; min-height: 32px; }
.tt-search-control button[aria-expanded="true"] { background: var(--tt-tint); color: var(--tt-link); }
.tt-toolbar .tt-filter-select { width: auto; max-width: 100%; }
.tt-board { display: flex; gap: 12px; min-width: 0; overflow-x: auto; padding-bottom: 8px; align-items: flex-start; }
.tt-board-column { flex: 1 0 clamp(210px, 25cqw, 300px); min-width: 0; border: 1px solid var(--tt-line); border-radius: 12px; background: var(--tt-fill); padding: 9px; }
.tt-board-column h2 { margin: 0 0 8px; padding: 3px 3px 5px; font-size: 13px; font-weight: 650; overflow-wrap: anywhere; }
.tt-board-cards { display: grid; gap: 8px; max-height: max(300px, calc(100dvh - 250px)); overflow-y: auto; }
.tt-card { min-width: 0; display: grid; gap: 7px; border: 1px solid var(--tt-line); border-radius: 9px; background: var(--tt-surface); padding: 11px; }
.tt-card .tt-srow-action { justify-content: flex-start; margin-inline-start: 0; }
.tt-sync-note { color: var(--tt-secondary); font-size: 12px; overflow-wrap: anywhere; }
.tt-branch-label { overflow-wrap: anywhere; color: var(--tt-secondary); font-size: 11px; }

.tt-story-title { font-size: 13.5px; font-weight: 600; color: var(--tt-text); text-decoration: none; line-height: 1.5; overflow-wrap: anywhere; }
a.tt-story-title:hover { color: var(--tt-link); text-decoration: underline; text-underline-offset: 3px; }
.tt-meta, .tt-smeta { display: flex; flex-wrap: wrap; gap: 4px 9px; font-size: 11px; color: var(--tt-secondary); align-items: center; font-variant-numeric: tabular-nums; }
.tt-chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; border-radius: 6px; background: var(--tt-fill); font-size: 11px; line-height: 1.4; max-width: 100%; overflow-wrap: anywhere; }
.tt-chip-id { font-variant-numeric: tabular-nums; }
.tt-chip-warn { color: var(--dsw-alias-state-warn-primary); }
.tt-chip-ok { color: var(--dsw-alias-state-success-primary); }
.tt-chip-idle { color: var(--tt-secondary); }
.tt-dot { flex: none; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.tt-note { border: 1px solid var(--tt-line); border-radius: 14px; background: var(--tt-surface); padding: 28px 18px; text-align: center; color: var(--tt-secondary); font-size: 12px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.tt-note-title { color: var(--tt-text); font-size: 14px; font-weight: 600; }
.tt-error { border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 10px; padding: 12px 14px; font-size: 12px; display: flex; flex-direction: column; gap: 6px; overflow-wrap: anywhere; }
.tt-error-msg { color: var(--tt-text); }
.tt-error-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; color: var(--tt-secondary); }
.tt-footer { font-size: 11px; color: var(--tt-secondary); display: flex; gap: 6px 12px; flex-wrap: wrap; overflow-wrap: anywhere; }
.tt-overlay { box-sizing: border-box; position: fixed; inset: 0; background: rgb(0 0 0 / 30%); backdrop-filter: blur(5px); display: grid; place-items: center; padding: 16px; z-index: 60; }
.tt-modal { box-sizing: border-box; width: min(640px, 100%); max-height: min(840px, calc(100dvh - 32px)); background: var(--tt-surface); border: 1px solid var(--tt-line); border-radius: 18px; overflow: auto; overscroll-behavior: contain; scroll-padding-block: 56px 64px; box-shadow: 0 20px 64px rgb(0 0 0 / 24%), 0 2px 8px rgb(0 0 0 / 8%); --tt-sheet-pad: clamp(14px, 3vw, 24px); }
.tt-modal-head, .tt-modal-foot { position: sticky; z-index: 1; background: var(--tt-surface); display: flex; align-items: center; gap: 8px; }
.tt-modal-head { top: 0; padding: 12px var(--tt-sheet-pad); border-bottom: 1px solid var(--tt-line); }
.tt-modal-title { font-size: 17px; font-weight: 650; flex: 1; }
.tt-modal-close { flex: none; width: 28px; height: 28px; padding: 0; background: var(--tt-fill); border-color: transparent; border-radius: 50%; }
.tt-modal-close:hover:not(:disabled) { background: var(--tt-line); }
.tt-modal-foot { bottom: 0; justify-content: flex-end; flex-wrap: wrap; padding: 12px var(--tt-sheet-pad); border-top: 1px solid var(--tt-line); }
.tt-modal-foot .tt-btn { min-height: 34px; white-space: normal; }
.tt-modal > .tt-stack { padding: 16px var(--tt-sheet-pad) 0; }
.tt-modal > .tt-stack > .tt-modal-foot { margin-inline: calc(-1 * var(--tt-sheet-pad)); }
.tt-dispatch-summary { display: grid; gap: 6px; }
.tt-dispatch-summary .tt-story-title { font-size: 15px; }
.tt-modal-compact { width: min(500px, 100%); --tt-sheet-pad: clamp(14px, 3vw, 20px); }
.tt-conversation-picker { align-self: flex-start; }
.tt-dispatch-checkout { display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 8px; padding: 8px 10px; border: 1px solid var(--tt-line); border-radius: 8px; color: var(--tt-secondary); font-size: 12px; }
.tt-dispatch-checkout code { color: var(--tt-text); overflow-wrap: anywhere; }
.tt-dispatch-extra summary { width: fit-content; color: var(--tt-secondary); font-size: 12px; cursor: pointer; }
.tt-dispatch-extra .tt-textarea { margin-top: 7px; display: block; }
.tt-dispatch-error { padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #cc3737) 10%, var(--tt-surface)); color: var(--tt-text); font-size: 12px; overflow-wrap: anywhere; }
.tt-dispatch-footnote { margin-inline-end: auto; color: var(--tt-secondary); font-size: 11px; }
.tt-field { display: flex; flex-direction: column; min-width: 0; gap: 5px; }
.tt-label { font-size: 12px; font-weight: 600; color: var(--tt-text); }
.tt-input, .tt-select, .tt-textarea { width: 100%; min-width: 0; box-sizing: border-box; background: var(--tt-fill); border: 1px solid var(--tt-line); border-radius: 8px; color: var(--tt-text); font: inherit; padding: 7px 10px; }
.tt-select { text-overflow: ellipsis; }
.tt-input:focus, .tt-select:focus, .tt-textarea:focus { outline: 2px solid var(--tt-ring); outline-offset: 1px; border-color: var(--tt-accent); background: var(--tt-surface); }
.tt-textarea { min-height: 70px; resize: vertical; }
.tt-hint { font-size: 11px; line-height: 1.55; color: var(--tt-secondary); overflow-wrap: anywhere; }
.tt-field-key { padding: 10px 12px; background: var(--tt-fill); border: 1px solid var(--tt-line); border-radius: 12px; }
.tt-label-key { display: flex; align-items: center; gap: 8px; }
.tt-label-badge { font-size: 10.5px; font-weight: 550; color: var(--tt-link); background: var(--tt-tint); border-radius: 5px; padding: 1px 6px; }
.tt-input-key { background: var(--tt-surface); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.tt-input-invalid, .tt-input-invalid:focus { border-color: var(--dsw-alias-state-error-primary); }
.tt-input-invalid:focus { outline-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 38%, transparent); }
.tt-options { background: var(--tt-fill); border: 1px solid var(--tt-line); border-radius: 11px; }
.tt-check { display: flex; gap: 10px; align-items: flex-start; font-size: 12px; cursor: pointer; }
.tt-check input, .tt-proj-row input { flex: none; margin: 2px 0 0; accent-color: var(--tt-accent); }
.tt-options .tt-check { padding: 9px 11px; font-weight: 550; }
.tt-options .tt-check + .tt-check { border-top: 1px solid var(--tt-line); }
.tt-options .tt-hint { display: block; margin-top: 2px; font-weight: 400; }
.tt-stack { display: flex; flex-direction: column; gap: 12px; }
.tt-row { display: flex; flex-wrap: wrap; gap: 10px; }
.tt-row > * { flex: 1 1 165px; min-width: 0; }
.tt-zentao-address { display: flex; flex-wrap: wrap; gap: 8px; }
.tt-zentao-address > .tt-input { flex: 1 1 180px; }
.tt-switch { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; background: var(--tt-fill); border: 1px solid var(--tt-line); border-radius: 8px; font-size: 12px; font-weight: 550; cursor: pointer; }
.tt-switch input { appearance: none; display: flex; align-items: center; width: 30px; height: 18px; margin: 0; padding: 2px; border-radius: 999px; background: var(--tt-secondary); cursor: pointer; }
.tt-switch input::before { content: ''; width: 14px; height: 14px; border-radius: 50%; background: #fff; }
.tt-switch input:checked { justify-content: flex-end; background: var(--tt-accent); }
.tt-story-open { appearance: none; border: 0; background: none; padding: 0; text-align: left; font: inherit; font-weight: 600; color: var(--tt-text); cursor: pointer; }
.tt-story-open:hover { color: var(--tt-accent); text-decoration: underline; }
.tt-sheet-layer { position: fixed; inset: 0; z-index: 80; display: flex; justify-content: flex-end; padding: 10px 10px 10px max(32px, 4vw); background: rgb(0 0 0 / 20%); }
.tt-sheet { box-sizing: border-box; width: min(1440px, 100%); height: 100%; display: flex; flex-direction: column; overflow: hidden; background: var(--tt-surface); border: 1px solid var(--tt-line); border-radius: 14px; box-shadow: 0 16px 52px rgb(0 0 0 / 22%); animation: tt-sheet-in 180ms ease-out; }
@keyframes tt-sheet-in { from { transform: translateX(14px); opacity: .6; } to { transform: none; opacity: 1; } }
.tt-sheet-head { flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 14px; padding: 12px 20px; border-bottom: 1px solid var(--tt-line); }
.tt-sheet-close { flex: none; width: 32px; height: 32px; padding: 0; background: transparent; border-color: transparent; color: var(--tt-secondary); }
.tt-sheet-heading { flex: 1 1 240px; min-width: 0; }
.tt-sheet-title { margin: 2px 0 0; font-size: 18px; line-height: 1.4; font-weight: 680; overflow-wrap: anywhere; }
.tt-sheet-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; color: var(--tt-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
.tt-sheet-source { font-weight: 650; color: var(--tt-link); }
.tt-sheet-actions, .tt-sheet-session-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.tt-sheet-actions { justify-content: flex-end; margin-inline-start: auto; max-width: 100%; }
.tt-sheet-actions .tt-btn { box-sizing: border-box; min-height: 32px; text-decoration: none; }
.tt-sheet-notice { display: flex; align-items: center; gap: 10px; padding: 8px 22px; border-bottom: 1px solid var(--tt-line); color: var(--tt-secondary); font-size: 12px; }
.tt-sheet-notice p { margin: 0; overflow-wrap: anywhere; }
.tt-sheet-cols { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) clamp(254px, 25%, 316px); }
.tt-sheet-left { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.tt-sheet-nav { display: flex; flex: none; flex-wrap: wrap; gap: 4px; padding: 8px 28px; border-bottom: 1px solid var(--tt-line); background: var(--tt-surface); }
.tt-sheet-nav .tt-btn { border-color: transparent; background: transparent; padding: 4px 9px; color: var(--tt-secondary); }
.tt-sheet-nav .tt-btn:hover { background: var(--tt-fill); color: var(--tt-text); }
.tt-sheet-count { font-size: 11px; font-weight: 500; font-variant-numeric: tabular-nums; }
.tt-sheet-main, .tt-sheet-side { min-width: 0; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.tt-sheet-main { flex: 1; padding: 0 28px 24px; }
.tt-sheet-side { padding: 20px 22px; border-inline-start: 1px solid var(--tt-line); background: color-mix(in srgb, var(--tt-text) 2%, var(--tt-surface)); }
.tt-sheet-side > h3, .tt-sheet-section > h3 { margin: 0 0 12px; color: var(--tt-text); font-size: 13px; font-weight: 680; }
.tt-sheet-section { padding: 20px 0; border-block-end: 1px solid var(--tt-line); scroll-margin-top: 8px; }
.tt-sheet-section:last-child { border-block-end: 0; }
.tt-sheet-desc { min-width: 0; overflow-wrap: anywhere; font-size: 14px; line-height: 1.72; color: var(--tt-text); }
.tt-sheet-plain, .tt-sheet-desc pre { white-space: pre-wrap; }
.tt-sheet-desc :where(p, div, ul, ol, blockquote, pre, h1, h2, h3, h4, h5, h6) { margin: 0 0 .8em; }
.tt-sheet-desc :where(p, div, ul, ol, blockquote, pre, h1, h2, h3, h4, h5, h6):last-child { margin-block-end: 0; }
.tt-sheet-desc :is(h1, h2, h3, h4, h5, h6) { margin-block: 1.1em .5em; font-size: 1.08em; line-height: 1.4; font-weight: 700; }
.tt-sheet-desc h1 { font-size: 1.6em; }
.tt-sheet-desc h2 { font-size: 1.42em; }
.tt-sheet-desc h3 { font-size: 1.28em; }
.tt-sheet-desc h4 { font-size: 1.16em; }
.tt-sheet-desc :is(h1, h2, h3, h4, h5, h6):first-child { margin-block-start: 0; }
.tt-sheet-desc :is(strong, b) { font-weight: 700; }
.tt-sheet-desc :where(ul, ol) { padding-inline-start: 1.6em; }
.tt-sheet-desc blockquote { padding-inline-start: 12px; border-inline-start: 3px solid var(--tt-line); color: var(--tt-secondary); }
.tt-sheet-desc pre { padding: 8px 12px; background: var(--tt-fill); border-radius: 6px; }
.tt-sheet-desc a { color: var(--tt-link); }
.tt-sheet-desc .tt-sheet-desc-table { max-width: 100%; margin-block: .85em 1.15em; overflow-x: auto; }
.tt-sheet-desc-table table { width: max-content; max-width: 100%; margin: 0; border-collapse: collapse; }
.tt-sheet-desc-table :is(th, td) { min-width: 5em; border: 1px solid color-mix(in srgb, var(--tt-text) 14%, var(--tt-surface)); padding: 6px 10px; text-align: start; vertical-align: top; }
.tt-sheet-desc-table th { background: var(--tt-fill); font-weight: 700; }
.tt-sheet-empty { margin: 0; font-size: 12px; color: var(--tt-secondary); }
.tt-sheet-warn { margin: 0 0 6px; color: var(--dsw-alias-state-error-primary, #a52e38); font-size: 12px; overflow-wrap: anywhere; }
.tt-shot { appearance: none; display: block; box-sizing: border-box; max-width: 100%; margin: 10px 0; padding: 0; border: 1px solid var(--tt-line); border-radius: 8px; overflow: hidden; background: var(--tt-surface); cursor: zoom-in; }
.tt-shot img { display: block; max-width: 100%; height: auto; }
.tt-shot:hover { border-color: var(--tt-accent); }
.tt-shot-layer { position: fixed; inset: 0; z-index: 90; display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; padding: 44px; background: rgb(0 0 0 / 76%); cursor: zoom-out; }
.tt-shot-full { max-width: 100%; max-height: 100%; border-radius: 8px; }
.tt-shot-close { position: absolute; top: 10px; right: 10px; }
.tt-files { list-style: none; margin: 0; padding: 0; }
.tt-file { display: flex; align-items: center; gap: 12px; padding: 8px 10px; margin: 0 -10px; border-radius: 10px; }
.tt-file:hover { background: var(--tt-fill); }
.tt-file-icon { flex: none; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; font-size: 9px; font-weight: 700; letter-spacing: .02em; color: #fff; background: #8e8e93; }
.tt-file-image { background: #34c759; }
.tt-file-sheet { background: #30b158; }
.tt-file-doc { background: #0a84ff; }
.tt-file-code { background: #5e5ce6; }
.tt-file-file { background: #8e8e93; }
.tt-file-main { flex: 1; min-width: 0; }
.tt-file-name { font-size: 13px; font-weight: 550; color: var(--tt-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-file-meta { margin-top: 2px; font-size: 11.5px; color: var(--tt-secondary); }
.tt-comment { display: flex; gap: 12px; padding: 10px 0; }
.tt-comment + .tt-comment { border-top: 1px solid var(--tt-line); }
.tt-avatar { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--tt-fill); border: 1px solid var(--tt-line); color: var(--tt-secondary); font-size: 12px; font-weight: 650; }
.tt-comment-body { flex: 1; min-width: 0; }
.tt-comment-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
.tt-comment-author { font-size: 12.5px; font-weight: 600; color: var(--tt-text); }
.tt-comment-time { font-size: 11.5px; color: var(--tt-secondary); }
.tt-comment-text { margin: 4px 0 0; font-size: 13px; line-height: 1.62; color: var(--tt-text); white-space: pre-wrap; overflow-wrap: anywhere; }
.tt-sheet-kv { display: grid; gap: 0; margin: 0; font-size: 12.5px; }
.tt-sheet-property { display: grid; grid-template-columns: minmax(0, 38%) minmax(0, 1fr); align-items: start; gap: 12px; padding: 7px 0; }
.tt-sheet-property dt { color: var(--tt-secondary); }
.tt-sheet-property dd { margin: 0; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.tt-sheet-apps { display: flex; flex-wrap: wrap; gap: 4px; }
.tt-sheet-badge { border: 1px solid color-mix(in srgb, var(--tt-badge-accent, var(--tt-secondary)) 25%, var(--tt-surface)); color: color-mix(in srgb, var(--tt-badge-accent, var(--tt-secondary)) 65%, var(--tt-text)); background: color-mix(in srgb, var(--tt-badge-accent, var(--tt-secondary)) 9%, var(--tt-surface)); font-weight: 600; }
.tt-badge-amber { --tt-badge-accent: #b86b0a; }
.tt-badge-red { --tt-badge-accent: #d63d55; }
.tt-badge-blue { --tt-badge-accent: #1675df; }
.tt-badge-green { --tt-badge-accent: #218248; }
@media (max-width: 720px) {
  .tt-sheet-layer { padding: 0; }
  .tt-sheet { border: 0; border-radius: 0; }
  .tt-sheet-head { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; padding: 9px 12px; }
  .tt-sheet-actions { grid-column: 1 / -1; justify-content: flex-start; margin-inline-start: 0; }
  .tt-sheet-cols { grid-template-columns: minmax(0, 1fr); grid-auto-rows: max-content; overflow: auto; overscroll-behavior: contain; }
  .tt-sheet-left, .tt-sheet-main, .tt-sheet-side { overflow: visible; }
  .tt-sheet-nav { padding-inline: 12px; }
  .tt-sheet-main { padding: 0 16px; }
  .tt-sheet-side { border-inline-start: 0; border-block-start: 1px solid var(--tt-line); padding: 18px 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .tt-sheet { animation: none; }
}
.tt-toast { position: sticky; bottom: 0; align-self: center; background: var(--tt-surface); border: 1px solid var(--tt-line); color: var(--tt-text); box-shadow: var(--tt-shadow); font-size: 12px; border-radius: 10px; padding: 7px 14px; }
.tt-muted { color: var(--tt-secondary); }
.tt-seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 3px; background: var(--tt-fill); border: 1px solid var(--tt-line); border-radius: 9px; }
.tt-seg button { appearance: none; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--tt-secondary); font: inherit; font-size: 12px; padding: 4px 10px; cursor: pointer; }
.tt-seg button.tt-seg-on { background: var(--tt-surface); color: var(--tt-text); border-color: var(--tt-line); box-shadow: 0 1px 3px rgb(0 0 0 / 8%); font-weight: 550; }
.tt-group { border: 1px solid var(--tt-line); border-radius: 14px; background: var(--tt-surface); box-shadow: var(--tt-shadow); overflow: hidden; }
.tt-group-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 10px; padding: 12px 16px; font-size: 13.5px; font-weight: 650; overflow-wrap: anywhere; }
.tt-group-range, .tt-group-count { color: var(--tt-secondary); font-weight: 400; font-size: 11px; font-variant-numeric: tabular-nums; }
.tt-group-count { margin-inline-start: auto; white-space: nowrap; }
.tt-shead, .tt-srow { display: grid; grid-template-columns: 122px 78px minmax(0, 1fr) 126px 70px 176px; gap: 10px; align-items: center; padding: 9px 14px; }
.tt-shead.tt-noapp, .tt-srow.tt-noapp { grid-template-columns: 78px minmax(0, 1fr) 126px 70px 176px; }
.tt-shead { background: var(--tt-fill); font-size: 11px; font-weight: 550; color: var(--tt-secondary); padding-block: 6px; }
.tt-srow { border-top: 1px solid var(--tt-line); }
.tt-srow:hover { background: color-mix(in srgb, var(--tt-text) 2%, var(--tt-surface)); }
.tt-sapp { min-width: 0; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 4px; }
.tt-sapp .tt-chip-app { display: block; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-sid, .tt-sowner { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--tt-secondary); font-size: 11.5px; }
.tt-sid { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
.tt-smain { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.tt-sstatus { min-width: 0; }
.tt-status { display: inline-block; box-sizing: border-box; max-width: 100%; padding: 3px 8px; background: var(--tt-fill); color: var(--tt-secondary); border-radius: 999px; font-size: 11px; font-weight: 550; line-height: 1.4; overflow-wrap: anywhere; }
.tt-status::before { content: ''; display: inline-block; vertical-align: .13em; width: 5px; height: 5px; border-radius: 50%; background: currentColor; margin-inline-end: 5px; }
.tt-status-open { background: var(--tt-tint); color: var(--tt-link); }
.tt-status-done { background: color-mix(in srgb, #34c759 12%, var(--tt-surface)); color: color-mix(in srgb, #2aa35a 62%, var(--tt-text)); }
.tt-srow-action, .tt-srow-buttons { display: flex; gap: 5px; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
.tt-srow-action .tt-chip { white-space: nowrap; }
.tt-proj { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--tt-line); border-radius: 9px; padding: 10px 12px; }
.tt-proj-row { display: flex; gap: 9px; align-items: flex-start; font-size: 12px; }
.tt-proj-name { font-weight: 550; }
.tt-proj-id { color: var(--tt-secondary); font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.tt-proj-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
@container tt-panel (max-width: 880px) {
  .tt-shead { display: none; }
  .tt-srow, .tt-srow.tt-noapp { display: flex; flex-wrap: wrap; gap: 7px 12px; }
  .tt-smain { flex-basis: 100%; order: -1; }
  .tt-sapp { max-width: 100%; }
  .tt-sowner, .tt-sid { overflow-wrap: anywhere; white-space: normal; }
  .tt-srow-action { margin-inline-start: auto; max-width: 100%; }
}
@container tt-panel (max-width: 460px) {
  .tt-srow, .tt-group-head { padding-inline: 12px; }
  .tt-sapp:not(:empty) { flex-basis: 100%; }
}
`

    function ensureStyles() {
      if (typeof document === 'undefined') return () => {}
      if (document.getElementById(STYLE_ID)) return () => {}
      const element = document.createElement('style')
      element.id = STYLE_ID
      element.textContent = CSS
      document.head.appendChild(element)
      return () => {
        element.remove()
      }
    }

    function apiUrl(path) {
      const relative = `api/task-hub/${path}`.replace(/^\/+/, '')
      if (typeof document === 'undefined') return `/${relative}`
      return new URL(relative, document.baseURI).pathname
    }

    async function api(path, body) {
      const response = await fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)
      if (!payload || payload.ok !== true) {
        const error = new Error(payload?.error?.message || `HTTP ${response.status}`)
        error.code = payload?.error?.code || 'tapd/unknown'
        throw error
      }
      return payload.value
    }

    function formatDate(value) {
      if (!value) return ''
      const text = String(value)
      return text.length >= 10 ? text.slice(0, 10) : text
    }

    function selectedProjectLabel(tasks, boot) {
      const names = tasks?.projectNames ?? boot?.settings?.tapd?.projectNames ?? {}
      const ids = (tasks?.projects ?? []).filter((entry) => entry.ok).map((entry) => entry.id)
      return ids.map((id) => names[id]).filter(Boolean).join(' · ')
    }

    function Icon(props) {
      const size = props.size || 16
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
        },
        h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M7 9.5h5M7 13h7M7 16.5h4', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('circle', { cx: 17.2, cy: 9.5, r: 2.1, fill: 'currentColor', opacity: 0.9 }),
      )
    }

    const TOOL_ICON_PATHS = {
      search: 'M15.5 15.5 20 20M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
      refresh: 'M20 7v5h-5M20 12a8 8 0 1 0-2.2 5.5',
      settings: 'M4 7h6m4 0h6M4 17h10m4 0h2M10 5v4m4 6v4',
      close: 'm6 6 12 12M18 6 6 18',
      external: 'M13 5h6v6m0-6-9 9m0-8H5v13h13v-5',
    }

    function ToolIcon({ name }) {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: TOOL_ICON_PATHS[name], stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }

    function Field(props) {
      const emphasis = Boolean(props.emphasis)
      return h(
        'label',
        { className: emphasis ? 'tt-field tt-field-key' : 'tt-field' },
        h(
          'span',
          { className: emphasis ? 'tt-label tt-label-key' : 'tt-label' },
          props.label,
          props.badge ? h('span', { className: 'tt-label-badge' }, props.badge) : null,
        ),
        props.children,
        props.hint ? h('span', { className: 'tt-hint' }, props.hint) : null,
      )
    }

    function Modal(props) {
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') props.onClose?.()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [props.onClose])
      return h(
        'div',
        {
          className: 'tt-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) props.onClose?.()
          },
        },
        h(
          'div',
          { className: props.compact ? 'tt-modal tt-modal-compact' : 'tt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title },
          h(
            'div',
            { className: 'tt-modal-head' },
            h('div', { className: 'tt-modal-title' }, props.title),
            h(
              'button',
              { className: 'tt-btn tt-modal-close', 'aria-label': props.t('close'), title: props.t('close'), onClick: props.onClose },
              h(ToolIcon, { name: 'close' }),
            ),
          ),
          props.children,
        ),
      )
    }

    function ErrorBox(props) {
      const t = props.t
      return h(
        'div',
        { className: 'tt-error' },
        h('div', { className: 'tt-error-msg' }, props.error?.message || t('errorGeneric')),
        props.error?.code ? h('div', { className: 'tt-error-code' }, props.error.code) : null,
        typeof props.onRetry === 'function'
          ? h('div', null, h('button', { className: 'tt-btn tt-btn-small', onClick: props.onRetry }, t('retry')))
          : null,
      )
    }

    function StatePill(props) {
      const t = props.t
      const dispatch = props.dispatch
      if (!dispatch) return null
      const status = dispatch.sessionMissing ? 'noSession'
        : dispatch.draftPending ? 'draftIncomplete'
          : dispatch.statusUnavailable ? 'statusUnavailable'
            : dispatch.running ? 'running'
              : dispatch.draftWaiting ? 'draftWaiting' : 'idle'
      const tone = status === 'running' ? 'ok' : ['noSession', 'statusUnavailable', 'draftIncomplete'].includes(status) ? 'warn' : 'idle'
      return h(
        'span',
        // 待发送 means "session exists, no first message yet": the sidebar can
        // only call that row 新会话, which reads like a bug when you come from
        // this board.
        { className: 'tt-chip tt-chip-' + tone, title: status === 'draftWaiting' ? t('draftWaitingHint') : undefined },
        h('span', { className: 'tt-dot' }),
        t(status),
      )
    }

    const STATUS_TONE = {
      planning: 'tt-status-neutral',
      developing: 'tt-status-open',
      testing: 'tt-status-open',
      resolved: 'tt-status-done',
      done: 'tt-status-done',
      closed: 'tt-status-done',
      rejected: 'tt-status-neutral',
    }

    function storyStatus(story) {
      const activeZentaoStory = story.source === 'zentao' && story.kind === 'story' && (!story.status || story.status === 'active')
      return (activeZentaoStory && story.stageLabel) || story.vStatus || story.status || ''
    }

    function storyTone(story) {
      return STATUS_TONE[story.status] ?? 'tt-status-open'
    }

    function sameStory(left, right) {
      return left.source === right.source && left.id === right.id
    }

    function detailStatusTone(story, label) {
      if (/^(新建|待开始|待开发|未开始|草稿)/.test(label) || ['planning', 'wait', 'draft'].includes(story.status)) return 'amber'
      if (/^(已完成|已上线|已发布|已关闭)/.test(label) || storyTone(story) === 'tt-status-done') return 'green'
      return storyTone(story) === 'tt-status-open' ? 'blue' : ''
    }

    const PRIORITY_TONE = new Map([
      ...['紧急', '最高', 'urgent', 'critical', 'p0', 'p1'].map((label) => [label, 'red']),
      ...['高', '高优先级', 'high', 'p2'].map((label) => [label, 'amber']),
      ...['正常', '中', '普通', 'normal', 'medium', 'p3'].map((label) => [label, 'blue']),
    ])

    function DetailBadge({ label, tone }) {
      return h('span', { className: 'tt-chip tt-sheet-badge' + (tone ? ' tt-badge-' + tone : '') }, label)
    }

    function buildGroups(stories, iterations) {
      const order = new Map()
      const ranges = new Map()
      for (const [index, iteration] of (iterations ?? []).entries()) {
        order.set(iteration.name, index)
        ranges.set(iteration.name, [iteration.startdate, iteration.enddate])
      }
      const groups = new Map()
      for (const story of stories) {
        const name = story.iterationName || ''
        let entry = groups.get(name)
        if (!entry) {
          entry = { name, stories: [], range: ranges.get(name) ?? [] }
          groups.set(name, entry)
        }
        entry.stories.push(story)
      }
      const list = [...groups.values()]
      list.sort((left, right) => {
        if (!left.name) return 1
        if (!right.name) return -1
        const a = order.has(left.name) ? order.get(left.name) : 900
        const b = order.has(right.name) ? order.get(right.name) : 900
        return a - b
      })
      return list
    }

    function appTags(app) {
      return String(app || '')
        .split(/[,，、|]/)
        .map((part) => part.trim())
        .filter(Boolean)
    }

    function groupByStatus(stories, unknown, configuredStatuses = []) {
      const groups = new Map()
      for (const story of stories) {
        const name = storyStatus(story) || unknown
        if (!groups.has(name)) groups.set(name, [])
        groups.get(name).push(story)
      }
      for (const name of configuredStatuses) {
        if (!groups.has(name)) groups.set(name, [])
      }
      return [...groups].map(([name, items]) => ({ name, stories: items }))
    }

    function filterStories(stories, query, project, app) {
      const tokens = query.toLowerCase().split(/\s+/).map((part) => part.replace(/^#+/, '')).filter(Boolean)
      return stories.filter((story) => {
        if (project && project !== `${story.source}:${story.projectId}`) return false
        if (app && !appTags(story.app).includes(app)) return false
        const searchable = [story.id, story.shortId, story.rootId, story.rootShortId, story.name, story.rootName].join(' ').toLowerCase()
        return tokens.every((part) => searchable.includes(part))
      })
    }

    function conversationOptions(dispatch) {
      return [dispatch, ...(dispatch?.previousSessions ?? [])].filter((entry) => entry?.sessionId && !entry.sessionMissing)
    }

    function TaskActions({ story, t, onDispatch, onOpen, onBackfill, backfilling, inDetail = false }) {
      const dispatch = story.dispatch
      const className = inDetail ? 'tt-sheet-session-actions' : 'tt-srow-action'
      if (!dispatch) {
        return h('div', { className },
          h('button', { className: 'tt-btn tt-btn-primary tt-btn-small', onClick: () => onDispatch(story) }, t('dispatch')))
      }
      const refreshing = backfilling === (story.uid ?? story.id)
      const refreshDraft = story.source === 'zentao' && dispatch.draft && !dispatch.draft.detailsLoaded
      const showBackfill = story.source !== 'tapd' &&
        (refreshDraft || !(dispatch.draft?.detailsLoaded || dispatch.attachments?.length || dispatch.images?.length || dispatch.draft?.assets?.length))
      return h('div', { className },
        !inDetail ? h(StatePill, { t, dispatch }) : null,
        !inDetail && dispatch.branch ? h('span', { className: 'tt-branch-label', title: dispatch.branch }, dispatch.branch) : null,
        onOpen && dispatch.sessionId && !dispatch.sessionMissing && !dispatch.draftPending
          ? h('button', { className: 'tt-btn tt-btn-small', onClick: () => onOpen(dispatch.sessionId, dispatch) }, t(inDetail ? 'openSession' : 'openShort'))
          : null,
        !dispatch.sessionMissing && (dispatch.draftPending || showBackfill) && onBackfill
          ? h('button', {
              className: 'tt-btn tt-btn-small',
              disabled: refreshing,
              onClick: () => onBackfill(story),
            }, t(refreshing ? 'backfilling' : dispatch.draftPending ? 'retryDraft' : refreshDraft ? 'refreshDraft' : 'backfill'))
          : null,
        h('button', { className: 'tt-btn tt-btn-small', onClick: () => onDispatch(story) }, t(dispatch.sessionMissing ? 'redispatch' : 'dispatch')),
      )
    }

    function TaskCard(props) {
      const { story, t } = props
      return h('article', { className: 'tt-card' },
        h('div', { className: 'tt-meta' },
          h('span', null, t(story.source === 'zentao' ? 'providerZentao' : 'providerTapd')),
          h('span', null, story.shortId || story.id),
          story.owner ? h('span', null, story.owner) : null),
        h('button', {
          type: 'button',
          className: 'tt-story-title tt-story-open',
          title: t('detail'),
          onClick: () => props.onDetails?.(story),
        }, story.name),
        h('div', { className: 'tt-meta' },
          appTags(story.app).map((app) => h('span', { key: app, className: 'tt-chip' }, app)),
          story.priorityLabel ? h('span', null, story.priorityLabel) : null,
          story.due ? h('span', null, `${t('due')} ${formatDate(story.due)}`) : null),
        h(TaskActions, props),
      )
    }

    function StoryRow(props) {
      const { story, t, showApp, showSource } = props
      const tags = showApp ? appTags(story.app) : []
      const meta = []
      if (showSource) meta.push(h('span', { key: 'source', className: 'tt-chip' }, t(story.source === 'zentao' ? 'providerZentao' : 'providerTapd')))
      if (story.source === 'zentao' && story.requirementType) {
        meta.push(h('span', { key: 'type', className: 'tt-chip' }, t(`zentaoType_${story.requirementType}`)))
      }
      if (story.priorityLabel) meta.push(h('span', { key: 'prio' }, story.priorityLabel))
      if (story.due) meta.push(h('span', { key: 'due' }, `${t('due')} ${formatDate(story.due)}`))
      if (story.created) meta.push(h('span', { key: 'created' }, formatDate(story.created)))
      if (story.shortId && story.rootShortId && story.rootShortId !== story.shortId) {
        meta.push(h('span', { key: 'child', className: 'tt-chip' }, `子需求 ${story.shortId}`))
      }
      return h(
        'div',
        { className: showApp ? 'tt-srow' : 'tt-srow tt-noapp' },
        showApp
          ? h(
              'div',
              { className: 'tt-sapp' },
              tags.map((app) =>
                h('span', { key: app, className: 'tt-chip tt-chip-app', title: `${t('app')}：${app}` }, app),
              ),
            )
          : null,
        h(
          'div',
          { className: 'tt-sid', title: `${story.rootShortId || story.shortId || story.id}${story.rootName ? ` · ${story.rootName}` : ''}\n${story.id}` },
          story.rootShortId || story.shortId || story.id,
        ),
        h(
          'div',
          { className: 'tt-smain' },
          h(
              'button',
              {
                type: 'button',
                className: 'tt-story-title tt-story-open',
                title: t('detail'),
                onClick: () => props.onDetails?.(story),
              },
              story.name,
            ),
          meta.length > 0 ? h('div', { className: 'tt-smeta' }, meta) : null,
        ),
        h('div', { className: 'tt-sstatus' }, storyStatus(story) ? h('span', { className: 'tt-status ' + storyTone(story) }, storyStatus(story)) : null),
        h('div', { className: 'tt-sowner', title: story.owner }, story.owner),
        h(TaskActions, props),
      )
    }

    const DESCRIPTION_ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }

    function plainDescription(value) {
      if (typeof value !== 'string' || !value.trim()) return ''
      return value
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|section|article|h[1-6]|li|tr|blockquote)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<[^>]+>/g, '')
        .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
          const key = `&${entity.toLowerCase()};`
          if (DESCRIPTION_ENTITIES[key]) return DESCRIPTION_ENTITIES[key]
          if (entity.startsWith('#x') || entity.startsWith('#X')) {
            const code = Number.parseInt(entity.slice(2), 16)
            return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
          }
          if (entity.startsWith('#')) {
            const code = Number.parseInt(entity.slice(1), 10)
            return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
          }
          return match
        })
        .split('\n')
        .map((line) => line.replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    function formatBytes(size) {
      const value = Number(size)
      if (!Number.isFinite(value) || value <= 0) return ''
      if (value < 1024) return `${value} B`
      if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
      return `${(value / (1024 * 1024)).toFixed(1)} MB`
    }

    function fileExt(name) {
      const ext = String(name ?? '').split('?')[0].split('.').pop()?.toLowerCase() ?? ''
      return /^[a-z0-9]{1,4}$/.test(ext) ? ext.toUpperCase() : 'FILE'
    }

    function fileTone(name) {
      const ext = String(name ?? '').split('?')[0].split('.').pop()?.toLowerCase() ?? ''
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
      if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
      if (['md', 'txt', 'doc', 'docx', 'pdf'].includes(ext)) return 'doc'
      if (['html', 'htm'].includes(ext)) return 'code'
      return 'file'
    }

    function initialOf(value) {
      const text = String(value ?? '').trim()
      return text ? text[0].toUpperCase() : '—'
    }

    const DETAIL_TAGS = new Set([
      'p', 'div', 'span', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ])
    const HIDDEN_DETAIL_TAGS = new Set(['script', 'style', 'template', 'noscript', 'iframe', 'object', 'embed', 'svg', 'math'])
    const DETAIL_TEXT_ALIGNMENTS = new Set(['left', 'center', 'right', 'start', 'end', 'justify'])
    const DETAIL_TABLE_CONTAINERS = new Set(['table', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr'])

    function detailLink(value, base) {
      if (!value || value.startsWith('#')) return ''
      try {
        const url = new URL(value, base || undefined)
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href
      } catch {}
      return ''
    }

    function richDescription(description, base, renderImage) {
      if (typeof description !== 'string' || !description.trim()) return null
      if (!/<[a-z][\w:-]*(?:\s|\/?>)/i.test(description)) return description
      if (typeof document === 'undefined') return plainDescription(description)

      // Parse in an inert template and build elements using the allowed tags
      // and properties below.
      const template = document.createElement('template')
      template.innerHTML = description
      const renderNode = (node, key) => {
        if (node.nodeType === 3) return node.nodeValue
        if (node.nodeType !== 1 || HIDDEN_DETAIL_TAGS.has(node.localName)) return null

        const tag = node.localName
        if (tag === 'img') return renderImage(node.getAttribute('src')?.trim(), node.getAttribute('alt')?.trim(), key)

        const children = Array.from(DETAIL_TABLE_CONTAINERS.has(tag) ? node.children : node.childNodes, renderNode)
        if (tag === 'a') {
          const href = detailLink(node.getAttribute('href')?.trim(), base)
          return href && !node.querySelector('img')
            ? h('a', { key, href, target: '_blank', rel: 'noreferrer noopener' }, children)
            : h(React.Fragment, { key }, children)
        }
        if (!DETAIL_TAGS.has(tag)) return h(React.Fragment, { key }, children)

        const style = {}
        const { fontWeight, fontStyle, textAlign, textDecorationLine, textDecoration } = node.style
        if (fontWeight === 'bold' || fontWeight === 'bolder') style.fontWeight = 700
        if (/^[1-9]00$/.test(fontWeight)) style.fontWeight = Number(fontWeight)
        if (fontStyle === 'italic') style.fontStyle = fontStyle
        if (DETAIL_TEXT_ALIGNMENTS.has(textAlign)) style.textAlign = textAlign
        const decorations = (textDecorationLine || textDecoration).match(/\b(?:underline|line-through)\b/g)
        if (decorations) style.textDecorationLine = decorations.join(' ')

        const props = { key, style }
        if (tag === 'ol' && node.hasAttribute('start')) props.start = node.start
        if (tag === 'th' || tag === 'td') Object.assign(props, { colSpan: node.colSpan, rowSpan: node.rowSpan })
        if (tag === 'th' && ['row', 'col', 'rowgroup', 'colgroup'].includes(node.scope)) props.scope = node.scope
        if ((tag === 'col' || tag === 'colgroup') && node.span > 1) props.span = node.span
        if (tag === 'br' || tag === 'hr' || tag === 'col') return h(tag, props)
        const element = h(tag, props, children)
        return tag === 'table' ? h('div', { key, className: 'tt-sheet-desc-table' }, element) : element
      }
      return Array.from(template.content.childNodes, renderNode)
    }

    const INLINE_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i

    function formatDetailTime(value) {
      return String(value ?? '').trim().replace(/^(\d{4}-\d{2}-\d{2})T/, '$1 ')
    }

    function StoryDetailModal(props) {
      const {
        story, t, loading, failed, error, attachments, comments, images, imagesError,
        attachmentsError, commentsError, syncMessage, onClose, onSync,
      } = props
      const files = Array.isArray(attachments) ? attachments : []
      const notes = Array.isArray(comments) ? comments : []
      const [preview, setPreview] = React.useState(null)
      const previewTrigger = React.useRef(null)
      const sections = React.useRef({})
      const loadedImages = Array.isArray(images) ? images : []
      const imagesBySource = new Map()
      for (const image of loadedImages) {
        for (const source of image.sources ?? []) imagesBySource.set(source, image)
      }

      const closePreview = () => {
        setPreview(null)
        previewTrigger.current?.focus()
      }
      const shot = (image, alt, key) => h(
        'button',
        {
          type: 'button',
          className: 'tt-shot',
          key,
          'aria-label': `${t('previewImage')}${alt ? ` · ${alt}` : ''}`,
          onClick: (event) => {
            previewTrigger.current = event.currentTarget
            setPreview({ ...image, alt })
          },
        },
        h('img', { src: image.dataUrl, alt, loading: 'lazy' }),
      )

      const description = richDescription(story.description, story.url, (source, alt, key) => {
        const image = imagesBySource.get(source)
        if (image) return shot(image, alt || image.name || '', key)
        if (source && source.length <= 8 * 1024 * 1024 + 32 && INLINE_IMAGE.test(source)) {
          return shot({ dataUrl: source }, alt || '', key)
        }
        return loading ? null : h('span', { key, className: 'tt-sheet-empty', title: alt }, t('imageUnavailable'))
      })
      const legacyImages = loadedImages.filter((image) => !Array.isArray(image.sources))
      const projectApps = appTags(story.app)
      const status = storyStatus(story)
      const priority = story.priorityLabel || story.priority
      const rootLabel = [story.rootShortId, story.rootName].filter(Boolean).join(' ')
      const parentId = story.parentId && String(story.parentId) !== '0' ? String(story.parentId) : ''
      const parent = parentId && parentId !== story.rootId
        ? parentId
        : (story.rootShortId !== story.shortId ? rootLabel : '') || parentId
      const fields = [
        [t('status'), status && h(DetailBadge, { label: status, tone: detailStatusTone(story, status) })],
        [t('priority'), priority && h(DetailBadge, { label: priority, tone: PRIORITY_TONE.get(String(priority).trim().toLowerCase()) })],
        [t('owner'), story.owner],
        [t('developer'), story.developer],
        [t('iteration'), story.iterationName],
        [t('app'), projectApps.length > 0 && h('div', { className: 'tt-sheet-apps' },
          projectApps.map((app, index) => h(DetailBadge, { key: index, label: app, tone: 'amber' })))],
        [t('module'), story.moduleName || story.categoryName],
        [t('parent'), parent],
        [t('begin'), formatDate(story.begin)],
        [t('end'), formatDate(story.due)],
        [t('effort'), story.effort || story.estimate],
        [t('creator'), story.creator],
        [t('created'), formatDetailTime(story.created)],
        [t('completed'), formatDetailTime(story.completed || story.closedDate)],
      ]

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key !== 'Escape') return
          if (preview) closePreview()
          else onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [onClose, preview])

      const section = (name, count, content) => h(
        'section',
        { className: 'tt-sheet-section', ref: (node) => { sections.current[name] = node }, tabIndex: -1, 'aria-label': t(name) },
        name !== 'requirementInfo' ? h('h3', null, count ? `${t(name)} · ${count}` : t(name)) : null,
        content,
      )
      const links = [['requirementInfo', 0], ['attachments', files.length], ['comments', notes.length]]
      const sourceUrl = detailLink(story.url)
      return h(
        'div',
        {
          className: 'tt-sheet-layer',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        },
        h(
          'aside',
          { className: 'tt-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': story.name || t('detail') },
          h(
            'header',
            { className: 'tt-sheet-head' },
            h('button', { type: 'button', className: 'tt-btn tt-sheet-close', onClick: onClose, 'aria-label': t('close'), autoFocus: true },
              h(ToolIcon, { name: 'close' })),
            h(
              'div',
              { className: 'tt-sheet-heading' },
              h('div', { className: 'tt-sheet-meta' },
                h('span', { className: 'tt-sheet-source' }, t(story.source === 'zentao' ? 'providerZentao' : 'providerTapd')),
                h('span', null, story.shortId || story.remoteId || story.id)),
              h('h2', { className: 'tt-sheet-title' }, story.name),
            ),
            h(
              'div',
              { className: 'tt-sheet-actions' },
              onSync ? h('button', { type: 'button', className: 'tt-btn', disabled: loading, onClick: onSync },
                h(ToolIcon, { name: 'refresh' }), t('syncRequirement')) : null,
              sourceUrl ? h('a', { className: 'tt-btn', href: sourceUrl, target: '_blank', rel: 'noreferrer noopener' },
                h(ToolIcon, { name: 'external' }), t('openSource')) : null,
              h(TaskActions, { ...props, inDetail: true }),
            ),
          ),
          failed || loading || syncMessage ? h(
            'div',
            { className: 'tt-sheet-notice', role: 'status' },
            h('p', null, [syncMessage && t(syncMessage), failed && error].filter(Boolean).join(' · ')
              || t(loading ? 'detailLoading' : 'detailFailed')),
          ) : null,
          h(
            'div',
            { className: 'tt-sheet-cols' },
            h(
              'div',
              { className: 'tt-sheet-left' },
              h('nav', { className: 'tt-sheet-nav', 'aria-label': t('detail') }, links.map(([name, count]) =>
                h('button', {
                  type: 'button',
                  className: 'tt-btn tt-btn-small',
                  key: name,
                  onClick: () => {
                    const target = sections.current[name]
                    target?.focus({ preventScroll: true })
                    target?.scrollIntoView({ block: 'start', inline: 'nearest' })
                  },
                }, t(name), count ? h('span', { className: 'tt-sheet-count' }, count) : null))),
              h(
                'div',
                { className: 'tt-sheet-main', 'aria-busy': Boolean(loading) },
                section('requirementInfo', 0, [
                  imagesError ? h('p', { key: 'image-error', className: 'tt-sheet-warn' }, t('imageUnavailable')) : null,
                  description || legacyImages.length
                    ? h('div', { key: 'body', className: typeof description === 'string' ? 'tt-sheet-desc tt-sheet-plain' : 'tt-sheet-desc' },
                      description, legacyImages.map((image, index) => shot(image, image.name || '', index)))
                    : !loading ? h('p', { key: 'empty', className: 'tt-sheet-empty' }, t('noDescription')) : null,
                ]),
                section('attachments', files.length,
                  attachmentsError ? h('p', { className: 'tt-sheet-warn' }, attachmentsError)
                    : files.length
                      ? h('ul', { className: 'tt-files' }, files.map((file, index) =>
                          h(
                            'li',
                            { className: 'tt-file', key: file.id || `${file.name}-${index}` },
                            h('span', { className: 'tt-file-icon tt-file-' + fileTone(file.name) }, fileExt(file.name)),
                            h(
                              'div',
                              { className: 'tt-file-main' },
                              h('div', { className: 'tt-file-name', title: file.name }, file.name),
                              h('div', { className: 'tt-file-meta' },
                                [file.owner, formatDetailTime(file.created), formatBytes(file.size)].filter(Boolean).join(' · ')),
                            ),
                          )))
                      : !loading ? h('p', { className: 'tt-sheet-empty' }, t('noAttachments')) : null),
                section('comments', notes.length,
                  commentsError ? h('p', { className: 'tt-sheet-warn' }, commentsError)
                    : notes.length
                      ? notes.map((comment, index) =>
                          h(
                            'div',
                            { className: 'tt-comment', key: comment.id || `${comment.created}-${index}` },
                            h('span', { className: 'tt-avatar' }, initialOf(comment.author)),
                            h(
                              'div',
                              { className: 'tt-comment-body' },
                              h('div', { className: 'tt-comment-head' },
                                h('span', { className: 'tt-comment-author' }, comment.author || '—'),
                                comment.created ? h('span', { className: 'tt-comment-time' }, formatDetailTime(comment.created)) : null),
                              h('p', { className: 'tt-comment-text' }, plainDescription(comment.text)),
                            ),
                          ))
                      : !loading ? h('p', { className: 'tt-sheet-empty' }, t('noComments')) : null),
              ),
            ),
            h(
              'aside',
              { className: 'tt-sheet-side' },
              h('h3', null, t('basicInfo')),
              h('dl', { className: 'tt-sheet-kv' }, fields.filter(([, value]) => value || value === 0).map(([label, value]) =>
                h('div', { className: 'tt-sheet-property', key: label }, h('dt', null, label), h('dd', null, value)))),
            ),
          ),
        ),
        preview ? h(
          'div',
          { className: 'tt-shot-layer', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('previewImage'), onClick: closePreview },
          h('button', { type: 'button', className: 'tt-btn tt-shot-close', 'aria-label': t('close'), autoFocus: true },
            h(ToolIcon, { name: 'close' })),
          h('img', { className: 'tt-shot-full', src: preview.dataUrl, alt: preview.alt }),
        ) : null,
      )
    }

    function parseZentaoIds(value) {
      return [...new Set(String(value ?? '').split(/[\s,，]+/).filter((id) => /^\d+$/.test(id)))]
    }

    function SettingsModal(props) {
      const {
        t,
        boot,
        draft,
        setDraft,
        projectCatalog,
        projectBusy,
        projectError,
        onFetchProjects,
        projectsText,
        setProjectsText,
        zentaoCatalog,
        zentaoBusy,
        onFetchZentaoContainers,
        onSave,
        onClose,
        saving,
        error,
      } = props
      const selectedIds = String(projectsText || '')
        .split(/[\s,，]+/)
        .map((id) => id.trim())
        .filter(Boolean)
      const toggleProject = (id) => {
        const next = selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]
        setProjectsText(next.join(', '))
      }
      const tokenMode = draft.authMode !== 'basic'
      const provider = draft.provider || 'tapd'
      const zentao = draft.zentao ?? {}
      const zentaoScope = zentao.scope ?? 'product'
      const projectScope = zentaoScope === 'project'
      const selectedZentaoIds = parseZentaoIds(zentao.containerIdsText)
      const visibleZentaoContainers = (zentaoCatalog ?? []).filter((item) => item.kind === zentaoScope)
      const missingZentaoIds = selectedZentaoIds.filter((id) => !visibleZentaoContainers.some((item) => item.id === id))
      const zentaoChoices = [...visibleZentaoContainers, ...missingZentaoIds.map((id) => ({
        id,
        kind: zentaoScope,
        name: zentao.containerNames?.[id] || id,
      }))]
      const savedZentao = boot?.settings?.zentao
      const hasSavedBasicPassword = boot?.credentialPresence?.zentao?.basicPassword &&
        zentao.baseUrl?.trim().replace(/\/+$/, '') === savedZentao?.baseUrl &&
        zentao.basicAccount?.trim() === savedZentao?.basicAccount
      const setZentao = (patch) => setDraft({ ...draft, zentao: { ...zentao, ...patch } })
      const toggleZentaoContainer = (id) => {
        const next = selectedZentaoIds.includes(id)
          ? selectedZentaoIds.filter((selected) => selected !== id)
          : [...selectedZentaoIds, id]
        setZentao({ containerIdsText: next.join(', ') })
      }
      const providerButton = (key, label) =>
        h(
          'button',
          {
            key,
            className: provider === key ? 'tt-seg-on' : '',
            onClick: () => setDraft({ ...draft, provider: key }),
          },
          label,
        )
      const tapdSection = h(
        React.Fragment,
        null,
        h(
          Field,
          { label: t('authMode') },
          h(
            'div',
            { className: 'tt-seg' },
            h(
              'button',
              {
                className: tokenMode ? 'tt-seg-on' : '',
                onClick: () => setDraft({ ...draft, authMode: 'token' }),
              },
              t('authToken'),
            ),
            h(
              'button',
              {
                className: tokenMode ? '' : 'tt-seg-on',
                onClick: () => setDraft({ ...draft, authMode: 'basic' }),
              },
              t('authBasic'),
            ),
          ),
        ),
        tokenMode
          ? h(
              Field,
              {
                label: t('tokenLabel'),
                hint: boot?.credentials?.tapd?.token ? t('tokenSaved') : t('tokenHint'),
              },
              h('input', {
                className: 'tt-input',
                type: 'password',
                value: draft.token,
                onChange: (event) => setDraft({ ...draft, token: event.target.value }),
                placeholder: boot?.credentials?.tapd?.token ? '••••••••••••' : '',
                autoComplete: 'new-password',
              }),
            )
          : h(
              'div',
              { className: 'tt-row' },
              h(Field, { label: t('basicUserLabel') }, h('input', {
                className: 'tt-input',
                value: draft.apiUser,
                onChange: (event) => setDraft({ ...draft, apiUser: event.target.value }),
                placeholder: 'api_user',
                autoComplete: 'off',
              })),
              h(
                Field,
                {
                  label: t('basicPasswordLabel'),
                  hint: boot?.credentials?.tapd?.password ? t('basicPasswordSaved') : t('basicPasswordMissing'),
                },
                h('input', {
                  className: 'tt-input',
                  type: 'password',
                  value: draft.apiPassword,
                  onChange: (event) => setDraft({ ...draft, apiPassword: event.target.value }),
                  placeholder: boot?.credentials?.tapd?.password ? '••••••••' : '',
                  autoComplete: 'new-password',
                }),
              ),
            ),
        h('label', { className: 'tt-check' },
          h('input', {
            type: 'checkbox',
            checked: draft.allowQueryAuth === true,
            onChange: (event) => setDraft({ ...draft, allowQueryAuth: event.target.checked }),
          }),
          h('span', null, t('allowQueryAuth'), h('span', { className: 'tt-hint' }, t('queryAuthHint')))),
        h(
          'div',
          { className: 'tt-row' },
          h(Field, { label: t('nickLabel'), hint: t('nickHint') }, h('input', {
            className: 'tt-input',
            value: draft.nick,
            onChange: (event) => setDraft({ ...draft, nick: event.target.value }),
            placeholder: 'spring.wang',
          })),
          h(Field, { label: t('ownerName'), hint: t('ownerNameHint') }, h('input', {
            className: 'tt-input',
            value: draft.owner,
            onChange: (event) => setDraft({ ...draft, owner: event.target.value }),
          })),
        ),
        h(
          Field,
          { label: t('projectsTitle'), hint: t('projectsPickerHint') },
          h(
            'div',
            { className: 'tt-proj' },
            h(
              'div',
              { className: 'tt-proj-tools' },
              h(
                'button',
                { className: 'tt-btn tt-btn-small', onClick: onFetchProjects, disabled: projectBusy },
                projectBusy ? t('fetchingProjects') : t('fetchProjects'),
              ),
              h('span', { className: 'tt-hint' }, selectedIds.length > 0 ? `${t('projectSelected')} ${selectedIds.length}` : t('pickProjectsFirst')),
            ),
            projectCatalog.length > 0
              ? projectCatalog.map((project) =>
                  h(
                    'label',
                    { className: 'tt-proj-row', key: project.id },
                    h('input', {
                      type: 'checkbox',
                      checked: selectedIds.includes(project.id),
                      onChange: () => toggleProject(project.id),
                    }),
                    h(
                      'span',
                      null,
                      h('span', { className: 'tt-proj-name' }, project.name),
                      project.category && project.category !== 'project'
                        ? h('span', { className: 'tt-hint' }, ` · ${project.category}`)
                        : null,
                      h('div', { className: 'tt-proj-id' }, project.id),
                    ),
                  ),
                )
              : h('span', { className: 'tt-hint' }, projectError ? projectError : t('projectsPickerHint')),
            projectError && projectCatalog.length > 0 ? h('span', { className: 'tt-hint' }, projectError) : null,
            h(Field, { label: t('projectsManual') }, h('input', {
              className: 'tt-input',
              value: projectsText,
              onChange: (event) => setProjectsText(event.target.value),
              placeholder: '68200255',
            })),
          ),
        ),
      )
      const zentaoSection = h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'tt-field' },
          h('label', { className: 'tt-label', htmlFor: 'tt-zentao-url' }, t('zentaoBaseUrl')),
          h(
            'div',
            { className: 'tt-zentao-address' },
            h('input', {
              id: 'tt-zentao-url',
              className: 'tt-input',
              value: zentao.baseUrl ?? '',
              onChange: (event) => setZentao({ baseUrl: event.target.value }),
              placeholder: 'https://zentao.example.com',
            }),
            h(
              'label',
              { className: 'tt-switch' },
              'Basic Auth',
              h('input', {
                type: 'checkbox',
                role: 'switch',
                checked: zentao.basicAuth === true,
                onChange: (event) => setZentao({ basicAuth: event.target.checked }),
              }),
            ),
          ),
          h('span', { className: 'tt-hint' }, t('zentaoBaseUrlHint')),
        ),
        zentao.basicAuth
          ? h(
              'div',
              { className: 'tt-stack tt-field-key' },
              h(
                'div',
                { className: 'tt-row' },
                h(Field, { label: t('zentaoBasicAccount') }, h('input', {
                  className: 'tt-input',
                  value: zentao.basicAccount,
                  onChange: (event) => setZentao({ basicAccount: event.target.value }),
                  autoComplete: 'off',
                })),
                h(
                  Field,
                  {
                    label: t('zentaoBasicPassword'),
                    hint: t(hasSavedBasicPassword ? 'zentaoPasswordSaved' : 'zentaoPasswordMissing'),
                  },
                  h('input', {
                    className: 'tt-input',
                    type: 'password',
                    value: zentao.basicPassword,
                    onChange: (event) => setZentao({ basicPassword: event.target.value }),
                    autoComplete: 'new-password',
                  }),
                ),
              ),
              h('span', { className: 'tt-hint' }, t('zentaoBasicHint')),
            )
          : null,
        h(
          'div',
          { className: 'tt-row' },
          h(Field, { label: t('zentaoAccount') }, h('input', {
            className: 'tt-input',
            value: zentao.account ?? '',
            onChange: (event) => setZentao({ account: event.target.value }),
            autoComplete: 'off',
          })),
          h(
            Field,
            {
              label: t('zentaoPassword'),
              hint: boot?.credentials?.zentao?.password ? t('zentaoPasswordSaved') : t('zentaoPasswordMissing'),
            },
            h('input', {
              className: 'tt-input',
              type: 'password',
              value: zentao.password ?? '',
              onChange: (event) => setZentao({ password: event.target.value }),
              placeholder: boot?.credentials?.zentao?.password ? '••••••••' : '',
              autoComplete: 'new-password',
            }),
          ),
        ),
        h(
          'div',
          { className: 'tt-row' },
          h(
            Field,
            { label: t('zentaoScope') },
            h(
              'select',
              {
                className: 'tt-select',
                value: zentaoScope,
                onChange: (event) => setZentao({ scope: event.target.value, containerIdsText: '', containerNames: {} }),
              },
              h('option', { value: 'product' }, t('zentaoScopeProduct')),
              h('option', { value: 'project' }, t('zentaoScopeProject')),
            ),
          ),
          h(Field, { label: t(projectScope ? 'zentaoProjectId' : 'zentaoProductId'), hint: t('zentaoContainerHint') }, h('input', {
            className: 'tt-input',
            value: zentao.containerIdsText ?? '',
            onChange: (event) => setZentao({ containerIdsText: event.target.value }),
            placeholder: '1, 2',
          })),
        ),
        h(
          'div',
          { className: 'tt-proj' },
          h(
            'div',
            { className: 'tt-proj-tools' },
            h(
              'button',
              { className: 'tt-btn tt-btn-small', onClick: onFetchZentaoContainers, disabled: zentaoBusy },
              zentaoBusy ? t('zentaoFetchingContainers') : t(projectScope ? 'zentaoFetchProjects' : 'zentaoFetchProducts'),
            ),
            h('span', { className: 'tt-hint' }, `${t('projectSelected')} ${selectedZentaoIds.length}`),
          ),
          projectError ? h('span', { className: 'tt-hint' }, projectError) : null,
          zentaoChoices.map((item) =>
            h(
              'label',
              { className: 'tt-proj-row', key: `${item.kind}:${item.id}` },
              h('input', {
                type: 'checkbox',
                checked: selectedZentaoIds.includes(item.id),
                onChange: () => toggleZentaoContainer(item.id),
              }),
              h(
                'span',
                null,
                h('span', { className: 'tt-proj-name' }, item.name),
                h('span', { className: 'tt-proj-id', style: { display: 'block' } }, `${t(projectScope ? 'zentaoProjectId' : 'zentaoProductId')} · ${item.id}`),
              ),
            ),
          ),
          zentaoCatalog && !zentaoBusy && !projectError && visibleZentaoContainers.length === 0
            ? h('span', { className: 'tt-hint' }, t(projectScope ? 'zentaoNoProjects' : 'zentaoNoProducts'))
            : null,
        ),
      )
      return h(
        Modal,
        { t, title: t('settings'), onClose },
        h(
          'div',
          { className: 'tt-stack' },
          h(
            Field,
            { label: t('provider'), hint: t('providerHint') },
            h(
              'div',
              { className: 'tt-seg' },
              providerButton('tapd', t('providerTapd')),
              providerButton('zentao', t('providerZentao')),
            ),
          ),
          provider === 'tapd' ? tapdSection : null,
          provider === 'zentao' ? zentaoSection : null,
          h(
            'div',
            { className: 'tt-row' },
            h(Field, { label: t('defaultWorkspace') }, h(
              'select',
              {
                className: 'tt-select',
                value: draft.defaultWorkspacePath,
                onChange: (event) => setDraft({ ...draft, defaultWorkspacePath: event.target.value }),
              },
              h('option', { value: '' }, '—'),
              (boot?.workspaces ?? []).map((workspace) =>
                h('option', { key: workspace.id, value: workspace.path }, `${workspace.title} — ${workspace.path}`),
              ),
            )),
            h(Field, { label: t('baseBranch') }, h('input', {
              className: 'tt-input',
              value: draft.baseBranch,
              onChange: (event) => setDraft({ ...draft, baseBranch: event.target.value }),
              placeholder: 'master',
            })),
          ),
          h(
            'label',
            { className: 'tt-check' },
            h('input', {
              type: 'checkbox',
              checked: draft.excludeCompleted,
              onChange: (event) => setDraft({ ...draft, excludeCompleted: event.target.checked }),
            }),
            h('span', null, t('excludeCompleted')),
          ),
          error ? h(ErrorBox, { t, error }) : null,
          h(
            'div',
            { className: 'tt-modal-foot' },
            h('button', { className: 'tt-btn', onClick: onClose }, t('cancel')),
            h('button', { className: 'tt-btn tt-btn-primary', onClick: onSave, disabled: saving }, saving ? t('saving') : t('save')),
          ),
        ),
      )
    }

    function DispatchModal(props) {
      const { t, story, boot, form, setForm, onSubmit, onClose, busy, error } = props
      const workspaces = boot?.workspaces ?? []
      const selectValue = form.mode === 'custom' ? '__custom__' : form.workspaceId
      const existing = form.conversation === 'existing'
      const candidates = conversationOptions(story.dispatch)
      const checkout = story.dispatch?.branch ? story.dispatch : null
      const target = existing ? candidates.find((entry) => entry.sessionId === form.sessionId) : checkout
      const workspacePath = workspaces.find((workspace) => workspace.id === target?.workspaceId)?.path ||
        target?.worktreePath || target?.repoPath
      const confirm = existing ? 'prepareExisting' : checkout ? 'prepareNew' : 'dispatchConfirm'
      return h(
        Modal,
        { t, title: t('dispatchTitle'), onClose, compact: Boolean(checkout || candidates.length) },
        h(
          'div',
          { className: 'tt-stack' },
          h(
            'div',
            { className: 'tt-dispatch-summary' },
            h('div', { className: 'tt-story-title' }, story.name),
            h(
              'div',
              { className: 'tt-meta' },
              h('span', { className: 'tt-chip tt-chip-id' }, `#${String(story.shortId || story.id).replace(/^#+/, '')}`),
              story.source ? h('span', { className: 'tt-chip' }, t('provider' + story.source[0].toUpperCase() + story.source.slice(1))) : null,
              storyStatus(story) ? h('span', { className: 'tt-status ' + storyTone(story) }, storyStatus(story)) : null,
              story.app ? h('span', { className: 'tt-chip' }, story.app) : null,
            ),
          ),
          candidates.length ? h('div', {
            className: 'tt-seg tt-conversation-picker',
            role: 'group',
            'aria-label': t('chooseConversation'),
          },
            h('button', {
              type: 'button',
              className: existing ? 'tt-seg-on' : '',
              'aria-pressed': existing,
              disabled: busy,
              onClick: () => setForm({ ...form, conversation: 'existing' }),
            }, t('existingConversation')),
            h('button', {
              type: 'button',
              className: existing ? '' : 'tt-seg-on',
              'aria-pressed': !existing,
              disabled: busy,
              onClick: () => setForm({ ...form, conversation: 'new' }),
            }, t('newConversation'))) : null,
          existing && candidates.length > 1 ? h('select', {
            className: 'tt-select',
            'aria-label': t('existingConversation'),
            value: form.sessionId,
            disabled: busy,
            onChange: (event) => setForm({ ...form, sessionId: event.target.value }),
          }, candidates.map((entry) => h('option', { key: entry.sessionId, value: entry.sessionId },
            [entry.branch || entry.sessionId, entry.createdAt && formatDate(entry.createdAt)].filter(Boolean).join(' · ')))) : null,
          target?.branch ? h('div', { className: 'tt-dispatch-checkout', title: workspacePath },
            h('span', null, t('reuseCheckout')),
            h('code', null, target.branch)) : null,
          existing || checkout ? null :
          h(React.Fragment, null,
            h(
              Field,
              {
                label: t('dispatchBranch'),
                hint: t('dispatchBranchHint'),
                emphasis: true,
                badge: t('dispatchBranchRequiredTag'),
              },
              h('input', {
                className:
                  error?.code === 'dispatch/missing-branch' ? 'tt-input tt-input-key tt-input-invalid' : 'tt-input tt-input-key',
                value: form.branchName,
                onChange: (event) => setForm({ ...form, branchName: event.target.value }),
                autoComplete: 'off',
                spellCheck: false,
                autoFocus: true,
                'aria-required': true,
                'aria-invalid': error?.code === 'dispatch/missing-branch' || undefined,
              }),
            ),
            h(
              Field,
              { label: t('dispatchTarget'), hint: workspaces.length === 0 ? t('noWorkspace') : null },
              h(
                'select',
                {
                  className: 'tt-select',
                  value: selectValue,
                  onChange: (event) => {
                    const value = event.target.value
                    if (value === '__custom__') setForm({ ...form, mode: 'custom', workspaceId: '' })
                    else setForm({ ...form, mode: 'workspace', workspaceId: value })
                  },
                },
                workspaces.map((workspace) =>
                  h('option', { key: workspace.id, value: workspace.id }, `${workspace.title} — ${workspace.path}`),
                ),
                h('option', { value: '__custom__' }, t('dispatchCustom')),
              ),
            ),
            form.mode === 'custom'
              ? h(Field, { label: t('dispatchTarget') }, h('input', {
                  className: 'tt-input',
                  value: form.workspacePath,
                  onChange: (event) => setForm({ ...form, workspacePath: event.target.value }),
                  placeholder: '/Users/you/repo',
                }))
              : null,
            h(Field, { label: t('dispatchBase'), hint: t('dispatchBaseHint') }, h('input', {
              className: 'tt-input',
              value: form.baseBranch,
              onChange: (event) => setForm({ ...form, baseBranch: event.target.value }),
              placeholder: 'master',
            })),
            h(
              'div',
              { className: 'tt-options' },
              h(
                'label',
                { className: 'tt-check' },
                h('input', {
                  type: 'checkbox',
                  checked: form.useWorktree,
                  onChange: (event) => setForm({ ...form, useWorktree: event.target.checked }),
                }),
                h(
                  'span',
                  null,
                  t('dispatchWorktree'),
                  h('span', { className: 'tt-hint' }, t('dispatchWorktreeHint')),
                ),
              ),
              form.useWorktree
                ? null
                : h(
                    'label',
                    { className: 'tt-check' },
                    h('input', {
                      type: 'checkbox',
                      checked: form.smartCheckout !== false,
                      onChange: (event) => setForm({ ...form, smartCheckout: event.target.checked }),
                    }),
                    h(
                      'span',
                      null,
                      t('smartCheckout'),
                      h('span', { className: 'tt-hint' }, t('smartCheckoutHint')),
                    ),
                  ),
            ),
          ),
          h('details', { className: 'tt-dispatch-extra' },
            h('summary', null, t('dispatchPrompt')),
            h('textarea', {
              className: 'tt-textarea',
              'aria-label': t('dispatchPrompt'),
              placeholder: t('extraPromptPlaceholder'),
              value: form.prompt,
              onChange: (event) => setForm({ ...form, prompt: event.target.value }),
            })),
          error ? h('div', { className: 'tt-dispatch-error', role: 'alert', title: error.code },
            error.message || t('errorGeneric')) : null,
          h(
            'div',
            { className: 'tt-modal-foot' },
            h('span', { className: 'tt-dispatch-footnote' }, t('draftOnly')),
            h('button', { className: 'tt-btn', onClick: onClose, disabled: busy }, t('cancel')),
            h('button', { className: 'tt-btn tt-btn-primary', onClick: onSubmit, disabled: busy }, busy ? t('dispatching') : t(confirm)),
          ),
        ),
      )
    }

    function Panel(props) {
      const t = props.t
      const openSession = props.openSession
      const prepareDraft = props.prepareDraft
      const [boot, setBoot] = React.useState(null)
      const [tasks, setTasks] = React.useState(null)
      const [loading, setLoading] = React.useState(true)
      const [error, setError] = React.useState(null)
      const [filter, setFilter] = React.useState('open')
      const [viewSource, setViewSource] = React.useState('')
      const [view, setView] = React.useState('board')
      const [query, setQuery] = React.useState('')
      const [searchOpen, setSearchOpen] = React.useState(false)
      const searchButton = React.useRef(null)
      const closeSearch = () => {
        setSearchOpen(false)
        setQuery('')
        searchButton.current?.focus()
      }
      const [project, setProject] = React.useState('')
      const [app, setApp] = React.useState('')
      const [syncError, setSyncError] = React.useState('')
      const sourceRef = React.useRef('')
      const latestTaskRequest = React.useRef(0)
      const tasksLoading = React.useRef(false)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [draft, setDraft] = React.useState({
        provider: 'tapd',
        authMode: 'token',
        allowQueryAuth: false,
        token: '',
        apiUser: '',
        apiPassword: '',
        nick: '',
        owner: '',
        zentao: { baseUrl: '', basicAuth: false, basicAccount: '', basicPassword: '', account: '', password: '', scope: 'product', containerIdsText: '', containerNames: {} },
        defaultWorkspacePath: '',
        baseBranch: '',
        excludeCompleted: true,
      })
      const [projectsText, setProjectsText] = React.useState('')
      const [projectCatalog, setProjectCatalog] = React.useState([])
      const [projectBusy, setProjectBusy] = React.useState(false)
      const [projectError, setProjectError] = React.useState('')
      const [zentaoCatalog, setZentaoCatalog] = React.useState(null)
      const [zentaoBusy, setZentaoBusy] = React.useState(false)
      const [saving, setSaving] = React.useState(false)
      const [settingsError, setSettingsError] = React.useState(null)
      const [dialog, setDialog] = React.useState(null)
      const [detail, setDetail] = React.useState(null)
      const detailRequest = React.useRef(0)
      const [form, setForm] = React.useState({ mode: 'workspace', workspaceId: '', workspacePath: '', baseBranch: '', useWorktree: true, smartCheckout: true, prompt: '', branchName: '' })
      const [dispatching, setDispatching] = React.useState(false)
      const [backfilling, setBackfilling] = React.useState('')
      const [dispatchError, setDispatchError] = React.useState(null)
      const [toast, setToast] = React.useState('')
      const alive = React.useRef(true)

      React.useEffect(() => {
        return () => {
          alive.current = false
        }
      }, [])

      React.useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(''), 3000)
        return () => clearTimeout(timer)
      }, [toast])

      // Navigation failures used to be swallowed; surface them as a toast.
      const revealSession = (sessionId) => {
        if (!sessionId || typeof openSession !== 'function') return
        Promise.resolve(openSession(sessionId))
          .then((result) => {
            if (!result || result.ok || !alive.current) return
            setToast(result.reason === 'service' ? t('openUnavailable') : t('openFailed'))
          })
          .catch(() => {
            if (alive.current) setToast(t('openFailed'))
          })
      }

      // A restored draft keeps the session blank until its first message, and
      // DSH renders every blank session as 新会话 — so say what actually landed
      // in the composer instead of leaving an unexplained empty screen.
      const reportDraft = (result) => {
        if (!alive.current) return
        if (!result || !result.ok) {
          setToast(t('draftFailed'))
          return
        }
        if (result.alreadyStarted) {
          setToast(t('draftAlreadySent'))
          return
        }
        if (result.preserved) {
          setToast(t('existingDraftPreserved'))
          return
        }
        if (result.missing?.length) {
          setToast(t('draftPartial').replace('{n}', String(result.missing.length)))
          return
        }
        setToast(
          result.attachments > 0
            ? t('draftOpenedWithAttachments').replace('{n}', String(result.attachments))
            : t('draftOpened'),
        )
      }

      const openTask = (sessionId, dispatch) => {
        if (!sessionId) return
        const draft = dispatch?.draft
        // Drafts without body text still carry requirement screenshots, and
        // those are the files that used to be lost when only text was checked.
        if ((draft?.text || draft?.assets?.length) && typeof prepareDraft === 'function') {
          Promise.resolve(prepareDraft({ sessionId, draft }))
            .then(reportDraft)
            .catch(() => {
              if (alive.current) setToast(t('draftFailed'))
            })
          return
        }
        revealSession(sessionId)
      }

      const applyBoot = React.useCallback((next) => {
        setBoot(next)
        const settings = next.settings ?? {}
        const tapd = settings.tapd ?? {}
        const zentao = settings.zentao ?? {}
        setDraft((current) => ({
          ...current,
          provider: settings.provider ?? 'tapd',
          authMode: tapd.authMode === 'basic' ? 'basic' : 'token',
          allowQueryAuth: tapd.allowQueryAuth === true,
          token: '',
          apiUser: tapd.apiUser ?? '',
          apiPassword: '',
          nick: tapd.nick || next.nick || '',
          owner: tapd.owner ?? '',
          zentao: {
            baseUrl: zentao.baseUrl ?? '',
            basicAuth: zentao.basicAuth === true,
            basicAccount: zentao.basicAccount ?? '',
            basicPassword: '',
            account: zentao.account ?? '',
            password: '',
            scope: zentao.scope === 'project' ? 'project' : 'product',
            containerIdsText: (zentao.containerIds ?? []).join(', '),
            containerNames: zentao.containerNames ?? {},
          },
          defaultWorkspacePath: settings.defaultWorkspacePath ?? '',
          baseBranch: settings.baseBranch ?? '',
          excludeCompleted: settings.excludeCompleted !== false,
        }))
        const projectIds = Array.isArray(tapd.projects) ? tapd.projects : []
        setProjectsText(projectIds.join(', '))
        const names = tapd.projectNames ?? {}
        if (Object.keys(names).length > 0) {
          setProjectCatalog((current) => {
            const merged = new Map(current.map((project) => [project.id, project]))
            for (const id of projectIds) {
              if (names[id] && !merged.has(id)) merged.set(id, { id, name: names[id], category: 'project' })
            }
            return [...merged.values()]
          })
        }
      }, [])

      const loadTasks = React.useCallback(async ({ background = false } = {}) => {
        if (background && tasksLoading.current) return
        const request = ++latestTaskRequest.current
        tasksLoading.current = true
        if (!background) setLoading(true)
        setError(null)
        try {
          const result = await api('tasks', {
            provider: sourceRef.current || undefined,
            includeCompleted: true,
            includeStatusOptions: true,
          })
          if (!alive.current || request !== latestTaskRequest.current) return
          setTasks((current) => {
            if (current?.provider !== result.provider || !result.sourceErrors?.length) return result
            const staleSources = new Set(result.sourceErrors.map((entry) => entry.provider))
            const stale = current.stories.filter((story) => staleSources.has(story.source))
            return { ...result, stories: [...result.stories, ...stale] }
          })
          setSyncError('')
        } catch (failure) {
          if (!alive.current || request !== latestTaskRequest.current) return
          if (background) setSyncError(failure.message)
          else setError({ message: failure.message, code: failure.code })
        } finally {
          if (request === latestTaskRequest.current) {
            tasksLoading.current = false
            if (alive.current && !background) setLoading(false)
          }
        }
      }, [])

      const loadBoot = React.useCallback(async () => {
        const next = await api('state')
        if (!alive.current) return next
        applyBoot(next)
        return next
      }, [applyBoot])

      // First run: the token is enough to discover the projects the user joins.
      const autoProject = React.useRef(false)
      const ensureProjects = React.useCallback(
        async (state) => {
          const settings = state?.settings ?? {}
          if ((settings.provider ?? 'tapd') !== 'tapd') return
          const tapd = settings.tapd ?? {}
          const saved = Array.isArray(tapd.projects) ? tapd.projects : []
          if (saved.length > 0 || autoProject.current) return
          autoProject.current = true
          try {
            const result = await api('projects', {
              nick: tapd.nick || state?.nick || '',
              apiUser: tapd.apiUser || '',
            })
            if (!alive.current) return
            const list = Array.isArray(result.projects) ? result.projects : []
            setProjectCatalog(list)
            if (list.length === 0) return
            const first = list.find((project) => project.category === 'project') ?? list[0]
            const names = {}
            for (const project of list) names[project.id] = project.name
            setProjectsText(first.id)
            const next = await api('settings', {
              tapd: {
                projects: [first.id],
                projectNames: names,
                nick: result.nick || tapd.nick || '',
              },
            })
            if (!alive.current) return
            applyBoot(next)
            setToast(t('projectSelected'))
          } catch {
            // Fall back to the manual picker in the settings dialog.
          }
        },
        [applyBoot, t],
      )

      React.useEffect(() => {
        let cancelled = false
        ;(async () => {
          try {
            const next = await api('state')
            if (cancelled) return
            applyBoot(next)
            if (next.settings?.excludeCompleted === false) setFilter('all')
            await ensureProjects(next)
            await loadTasks()
          } catch (failure) {
            if (cancelled) return
            setError({ message: failure.message, code: failure.code })
            setLoading(false)
          }
        })()
        return () => {
          cancelled = true
        }
      }, [applyBoot, loadTasks])

      React.useEffect(() => {
        if (!tasks) return undefined
        const timer = setInterval(() => {
          if (document.visibilityState !== 'hidden') void loadTasks({ background: true })
        }, SYNC_MS)
        return () => clearInterval(timer)
      }, [Boolean(tasks), loadTasks])

      // Light polling: only session run-state changes, never TAPD again.
      React.useEffect(() => {
        if (!tasks) return undefined
        let disposed = false
        const tick = async () => {
          try {
            const snapshot = await api('status')
            if (disposed || !alive.current) return
            const byUid = Object.fromEntries(
              (snapshot.entries ?? []).map((entry) => [entry.uid ?? entry.storyId, entry]),
            )
            setTasks((current) => {
              if (!current) return current
              return {
                ...current,
                stories: current.stories.map((story) => {
                  const entry = byUid[story.uid] ?? (story.source === 'tapd' ? byUid[story.id] : undefined)
                  if (!entry) return story
                  return {
                    ...story,
                    dispatch: {
                      ...(story.dispatch ?? {}),
                      sessionId: entry.sessionId,
                      branch: entry.branch,
                      workspaceId: entry.workspaceId,
                      worktreePath: entry.worktreePath ?? story.dispatch?.worktreePath,
                      repoPath: entry.repoPath ?? story.dispatch?.repoPath,
                      createdAt: entry.createdAt,
                      running: Boolean(entry.running),
                      sessionMissing: Boolean(entry.sessionMissing),
                      statusUnavailable: Boolean(entry.statusUnavailable),
                      draftWaiting: Boolean(entry.draftWaiting),
                      draftPending: Boolean(entry.draftPending),
                      attachments: entry.attachments ?? story.dispatch?.attachments,
                      images: entry.images ?? story.dispatch?.images,
                      draft: 'draft' in entry ? entry.draft : entry.sessionId === story.dispatch?.sessionId ? story.dispatch?.draft : null,
                      previousSessions: entry.previousSessions ?? story.dispatch?.previousSessions,
                    },
                  }
                }),
              }
            })
          } catch {
            // Polling is best-effort; the explicit refresh reports real errors.
          }
        }
        const timer = setInterval(tick, POLL_MS)
        return () => {
          disposed = true
          clearInterval(timer)
        }
      }, [tasks !== null])

      const openSettings = () => {
        setSettingsError(null)
        setProjectError('')
        setSettingsOpen(true)
        void loadBoot().catch(() => {})
      }

      const fetchProjectList = async () => {
        setProjectBusy(true)
        setProjectError('')
        try {
          const result = await api('projects', {
            nick: draft.nick.trim(),
            apiUser: draft.apiUser.trim(),
            token: draft.token.trim(),
          })
          if (!alive.current) return
          const list = Array.isArray(result.projects) ? result.projects : []
          setProjectCatalog(list)
          if (list.length === 0) setProjectError(t('noProjects'))
          // First run: preselect the project so the panel has something to show.
          if (!projectsText.trim() && list.length > 0) {
            const first = list.find((project) => project.category === 'project') ?? list[0]
            setProjectsText(first.id)
          }
        } catch (failure) {
          if (!alive.current) return
          setProjectError(failure.message)
        } finally {
          if (alive.current) setProjectBusy(false)
        }
      }

      const fetchZentaoContainers = async () => {
        setZentaoBusy(true)
        setZentaoCatalog(null)
        setProjectError('')
        try {
          const result = await api('zentao/containers', {
            baseUrl: draft.zentao.baseUrl.trim(),
            basicAuth: draft.zentao.basicAuth,
            basicAccount: draft.zentao.basicAccount.trim(),
            basicPassword: draft.zentao.basicAuth ? draft.zentao.basicPassword : undefined,
            account: draft.zentao.account.trim(),
            password: draft.zentao.password,
          })
          if (!alive.current) return
          const list = [
            ...(result.products ?? []).map((item) => ({ ...item, kind: 'product' })),
            ...(result.projects ?? []).map((item) => ({ ...item, kind: 'project' })),
          ]
          setZentaoCatalog(list)
        } catch (failure) {
          if (!alive.current) return
          setProjectError(failure.message)
        } finally {
          if (alive.current) setZentaoBusy(false)
        }
      }

      const switchProvider = async (provider) => {
        if (provider === (viewSource || tasks?.provider || boot?.settings?.provider || 'tapd')) return
        latestTaskRequest.current += 1
        sourceRef.current = provider
        setViewSource(provider)
        setLoading(true)
        setTasks(null)
        setError(null)
        setSyncError('')
        setProject('')
        setApp('')
        setFilter(provider === 'all' || boot?.settings?.excludeCompleted === false ? 'all' : 'open')
        try {
          if (provider !== 'all' && provider !== boot?.settings?.provider) {
            const next = await api('settings', { provider })
            if (!alive.current) return
            applyBoot(next)
          }
          await loadTasks()
        } catch (failure) {
          if (alive.current) setError({ message: failure.message, code: failure.code })
        } finally {
          if (alive.current) setLoading(false)
        }
      }

      const saveSettings = async () => {
        setSaving(true)
        setSettingsError(null)
        try {
          const selected = String(projectsText || '')
            .split(/[\s,，]+/)
            .map((id) => id.trim())
            .filter((id) => /^\d+$/.test(id))
          const names = {}
          for (const project of projectCatalog) {
            if (selected.includes(project.id)) names[project.id] = project.name
          }
          const zentaoScope = draft.zentao.scope === 'project' ? 'project' : 'product'
          const containerIds = parseZentaoIds(draft.zentao.containerIdsText)
          const containerNames = { ...draft.zentao.containerNames }
          for (const item of zentaoCatalog ?? []) {
            if (item.kind === zentaoScope && containerIds.includes(item.id)) containerNames[item.id] = item.name
          }
          const patch = {
            provider: draft.provider,
            tapd: {
              authMode: draft.authMode === 'basic' ? 'basic' : 'token',
              allowQueryAuth: draft.allowQueryAuth === true,
              apiUser: draft.apiUser.trim(),
              nick: draft.nick.trim(),
              owner: draft.owner.trim(),
              projects: selected,
              projectNames: names,
            },
            zentao: {
              baseUrl: draft.zentao.baseUrl.trim(),
              basicAuth: draft.zentao.basicAuth,
              basicAccount: draft.zentao.basicAccount.trim(),
              account: draft.zentao.account.trim(),
              scope: zentaoScope,
              containerIds,
              containerNames,
            },
            defaultWorkspacePath: draft.defaultWorkspacePath,
            baseBranch: draft.baseBranch.trim(),
            excludeCompleted: Boolean(draft.excludeCompleted),
          }
          if (draft.token.trim()) patch.token = draft.token.trim()
          if (draft.apiPassword) patch.apiPassword = draft.apiPassword
          if (draft.zentao.password) patch.zentaoPassword = draft.zentao.password
          if (draft.zentao.basicAuth && draft.zentao.basicPassword) patch.zentaoBasicPassword = draft.zentao.basicPassword
          const next = await api('settings', patch)
          if (!alive.current) return
          applyBoot(next)
          if (sourceRef.current !== 'all') {
            if (sourceRef.current !== next.settings?.provider) setTasks(null)
            sourceRef.current = next.settings?.provider ?? ''
            setViewSource(sourceRef.current)
            setProject('')
            setApp('')
            setFilter(next.settings?.excludeCompleted === false ? 'all' : 'open')
          }
          setSettingsOpen(false)
          setToast(t('saveDone'))
          await loadTasks()
        } catch (failure) {
          if (!alive.current) return
          setSettingsError({ message: failure.message, code: failure.code })
        } finally {
          if (alive.current) setSaving(false)
        }
      }

      const startDispatch = (story) => {
        const workspaces = boot?.workspaces ?? []
        const settings = boot?.settings ?? {}
        const preferred = workspaces.find((workspace) => workspace.path === settings.defaultWorkspacePath) ?? workspaces[0]
        const original = conversationOptions(story.dispatch)[0]
        setForm({
          conversation: original ? 'existing' : 'new',
          sessionId: original?.sessionId ?? '',
          requestId: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(),
          mode: preferred ? 'workspace' : 'custom',
          workspaceId: preferred?.id ?? '',
          workspacePath: preferred?.path ?? '',
          baseBranch: settings.baseBranch ?? '',
          useWorktree: settings.useWorktree !== false,
          smartCheckout: true,
          prompt: '',
          branchName: '',
        })
        setDispatchError(null)
        setDialog(story)
      }

      const closeDetails = () => {
        detailRequest.current += 1
        setDetail(null)
      }

      const openDetails = async (story, previous) => {
        if (previous?.loading) return
        const request = ++detailRequest.current
        const pending = {
          attachments: story.attachments,
          comments: story.comments,
          ...previous,
          story,
          loading: true,
          failed: false,
          error: '',
          syncMessage: previous ? 'syncingRequirement' : '',
        }
        setDetail(pending)
        try {
          const result = await api('story', {
            provider: story.source,
            storyId: story.id,
            projectId: story.projectId,
            uid: story.uid,
            story: { ...story, dispatch: undefined },
          })
          if (!alive.current || request !== detailRequest.current) return
          const fresh = result.story
          const sameIteration = fresh.iterationId === story.iterationId
          const sameRoot = fresh.rootId === story.rootId
          const iteration = fresh.iterationId && tasks?.iterations?.find((entry) =>
            entry.id === fresh.iterationId && entry.projectId === fresh.projectId)
          const refreshed = {
            ...story,
            ...fresh,
            vStatus: fresh.vStatus || (fresh.status === story.status ? story.vStatus : ''),
            iterationName: fresh.iterationName || iteration?.name || (sameIteration ? story.iterationName : ''),
            rootName: fresh.rootName || (sameRoot ? story.rootName : ''),
            dispatch: story.dispatch,
          }
          const partial = Boolean(result.attachmentsError || result.commentsError || result.imagesError)
          const syncMessage = previous ? (partial ? 'requirementPartiallySynced' : 'requirementSynced') : ''
          setDetail({ ...result, story: refreshed, syncMessage })
          if (previous) {
            const { sourceFiles, attachments, comments, dispatch, ...snapshot } = refreshed
            setTasks((current) => current && ({
              ...current,
              stories: current.stories.map((entry) =>
                sameStory(entry, story) ? { ...entry, ...snapshot } : entry),
            }))
          }
        } catch (error) {
          if (!alive.current || request !== detailRequest.current) return
          const message = error?.message || String(error)
          setDetail({
            ...pending,
            loading: false,
            failed: true,
            error: /^HTTP 404\b/.test(message) ? `${message} · ${t('detailRestartHint')}` : message,
            syncMessage: previous ? 'requirementSyncFailed' : '',
          })
        }
      }

      const submitDispatch = async () => {
        if (!dialog) return
        setDispatching(true)
        setDispatchError(null)
        try {
          const continuing = form.conversation === 'existing'
          const needsCheckout = !continuing && !dialog.dispatch?.branch
          const branchName = form.branchName.trim()
          if (needsCheckout && !branchName) {
            setDispatchError({ message: t('dispatchBranchRequired'), code: 'dispatch/missing-branch' })
            setDispatching(false)
            return
          }
          const body = {
            storyId: dialog.id,
            provider: dialog.source,
            conversation: form.conversation,
            sessionId: continuing ? form.sessionId : undefined,
            requestId: form.requestId,
            uid: dialog.uid,
            projectId: dialog.projectId,
            story: { ...dialog, dispatch: undefined },
            extraInstructions: form.prompt.trim(),
          }
          if (needsCheckout) {
            body.branchName = branchName
            body.useWorktree = Boolean(form.useWorktree)
            body.smartCheckout = form.smartCheckout !== false
            body.baseBranch = form.baseBranch.trim()
            if (form.mode === 'custom') body.workspacePath = form.workspacePath.trim()
            else body.workspaceId = form.workspaceId
          }
          const record = await api('dispatch', body)
          if (!alive.current) return
          setDialog(null)
          if (continuing || record.continuation) {
            const result = record.draft ? await prepareDraft?.({ ...record, continuation: true }) : await openSession?.(record.sessionId)
            if (!alive.current) return
            if (!result?.ok) setToast(t('draftFailed'))
            else if (result.preserved) setToast(t('existingDraftPreserved'))
            else if (result.missing?.length) setToast(t('draftPartial').replace('{n}', String(result.missing.length)))
            else if (record.draft) setToast(t('draftReady'))
            void loadTasks({ background: true })
            return
          }
          // A draft dispatch leaves the session empty on purpose: the panel
          // fills the composer and the operator decides when to send.
          const isDraft = record.status === 'draft' || Boolean(record.draft)
          setToast(
            record.assetsAdded
              ? t('assetsAdded')
              : isDraft
                ? t('draftReady')
                : record.attachments?.length
                  ? t('dispatchedWithAttachments').replace('{n}', String(record.attachments.length))
                  : t('dispatched'),
          )
          setTasks((current) => {
            if (!current) return current
            return {
              ...current,
              stories: current.stories.map((story) =>
                (story.uid ?? story.id) === (dialog.uid ?? dialog.id)
                  ? {
                      ...story,
                      dispatch: {
                        sessionId: record.sessionId,
                        branch: record.branch,
                        workspaceId: record.workspaceId,
                        baseBranch: record.baseBranch,
                        worktreePath: record.worktreePath,
                        repoPath: record.repoPath,
                        createdAt: record.createdAt,
                        running: !isDraft,
                        status: record.status ?? '',
                        draft: record.draft ?? null,
                        draftWaiting: record.draftWaiting ?? isDraft,
                        draftPending: Boolean(record.draftPending),
                        previousSessions: record.previousSessions ?? [],
                        sessionMissing: false,
                        attachments: record.attachments ?? [],
                        images: record.images ?? [],
                      },
                    }
                  : story,
              ),
            }
          })
          if (record.sessionId) {
            setTimeout(() => {
              if (isDraft && typeof props.prepareDraft === 'function') {
                Promise.resolve(props.prepareDraft(record))
                  .then((result) => {
                    if (!alive.current) return
                    if (!result?.ok) setToast(t('draftFailed'))
                    else if (result.missing?.length) setToast(t('draftPartial').replace('{n}', String(result.missing.length)))
                  })
                  .catch(() => {
                    if (alive.current) setToast(t('draftFailed'))
                  })
                return
              }
              revealSession(record.sessionId)
            }, 60)
          }
        } catch (failure) {
          if (!alive.current) return
          setDispatchError({ message: failure.message, code: failure.code })
        } finally {
          if (alive.current) setDispatching(false)
        }
      }

      // The button only works when the host route understands the backfill
      // path; an old host would just return the text-only session.
      const backfillSupported = (() => {
        const [major, minor, patch] = String(boot?.version ?? '0.0.0').split('.').map((part) => Number(part) || 0)
        return major > 0 || minor > 5 || (minor === 5 && patch >= 1)
      })()

      const backfillAssets = async (story) => {
        setBackfilling(story.uid ?? story.id)
        try {
          const retryDraft = story.dispatch?.draftPending === true
          const refreshDraft = !retryDraft && story.source === 'zentao' && Boolean(story.dispatch?.draft)
          const record = await api('dispatch', {
            storyId: story.id,
            provider: story.source,
            conversation: retryDraft ? 'retry' : undefined,
            uid: story.uid,
            projectId: story.projectId,
            story: { ...story, dispatch: undefined },
            refreshDraft,
            deliver: refreshDraft || retryDraft ? 'draft' : 'send',
          })
          if (!alive.current) return
          if ((refreshDraft && record.draft?.detailsLoaded) || retryDraft) {
            const result = await prepareDraft?.(record)
            if (!alive.current) return
            if (!result?.ok) setToast(t('draftFailed'))
            else if (result.alreadyStarted) setToast(t('refreshDraftStarted'))
            else if (result.preserved) setToast(t('refreshDraftPreserved'))
            else if (result.missing?.length) setToast(t('draftPartial').replace('{n}', String(result.missing.length)))
            else setToast(t('draftReady'))
          } else if (record.assetsAdded) {
            setToast(t('assetsAdded'))
            if (record.sessionId) {
              setTimeout(() => revealSession(record.sessionId), 60)
            }
          } else {
            setToast(t('assetsUpToDate'))
          }
          await loadTasks()
        } catch (failure) {
          if (alive.current) setToast(failure.message)
        } finally {
          if (alive.current) setBackfilling('')
        }
      }

      const stories = tasks?.stories ?? []
      const currentCard = detail && stories.find((story) => sameStory(story, detail.story))
      const detailStory = currentCard ? { ...detail.story, dispatch: currentCard.dispatch } : detail?.story
      const matching = filterStories(stories, query, project, app)
      const visible = matching.filter((story) => filter === 'open' ? !story.completed : filter === 'done' ? story.completed : true)
      const counts = {
        all: matching.length,
        open: matching.filter((story) => !story.completed).length,
        done: matching.filter((story) => story.completed).length,
      }
      const configuredStatuses = filter === 'all' && !query.trim() && !app
        ? [
            ...(tasks?.projects ?? [])
              .filter((entry) => entry.ok && (!project || project === `tapd:${entry.id}`))
              .flatMap((entry) => entry.statuses ?? []),
            ...(!project || project.startsWith('zentao:') ? tasks?.statusOptions?.zentao ?? [] : []),
          ]
        : []
      const groups = view === 'board'
        ? groupByStatus(visible, t('unknownStatus'), configuredStatuses)
        : buildGroups(visible, tasks?.iterations ?? [])
      const showApp = visible.some((story) => appTags(story.app).length > 0)
      const projects = new Map()
      const apps = new Set()
      for (const story of stories) {
        if (story.projectId) {
          const names = story.source === 'zentao' ? boot?.settings?.zentao?.containerNames : tasks?.projectNames
          const id = `${story.source}:${story.projectId}`
          projects.set(id, names?.[story.projectId] || story.projectId)
        }
        for (const name of appTags(story.app)) apps.add(name)
      }
      const renderFilter = (label, value, choices, onChange) => h('select', {
        className: 'tt-select tt-filter-select',
        'aria-label': label,
        value,
        onChange: (event) => onChange(event.target.value),
      }, h('option', { value: '' }, label), [...choices].map(([key, name]) => h('option', { key, value: key }, name)))
      const setupError = Boolean(
        error &&
          (error.code.endsWith('/missing-credentials') ||
            error.code.endsWith('/missing-base-url') ||
            error.code.endsWith('/missing-container') ||
            error.code.endsWith('/missing-projects') ||
            error.code.endsWith('/missing-nick')),
      )
      const provider = viewSource || tasks?.provider || boot?.settings?.provider || 'tapd'
      const providerLabel = t('provider' + provider[0].toUpperCase() + provider.slice(1))
      const zentaoSettings = boot?.settings?.zentao
      const projectLabel = provider === 'tapd' ? selectedProjectLabel(tasks, boot)
        : provider === 'zentao' ? (zentaoSettings?.containerIds ?? []).map((id) => zentaoSettings.containerNames?.[id] || id).join(' · ') : ''
      const renderStory = (Component, story) => h(Component, {
        key: story.uid ?? story.id,
        story, t, showApp, showSource: provider === 'all', onDispatch: startDispatch, onOpen: openTask, onDetails: openDetails,
        onBackfill: backfillSupported || story.dispatch?.draftPending ? backfillAssets : undefined,
        backfilling,
      })

      const tab = (key, label) =>
        h(
          'button',
          { className: 'tt-tab' + (filter === key ? ' tt-tab-on' : ''), 'aria-pressed': filter === key, onClick: () => setFilter(key) },
          label,
          h('span', { className: 'tt-tab-total' }, counts[key]),
        )

      return h(
        'div',
        { className: 'tt-root' },
        h(
          'div',
          { className: 'tt-shell' },
          h(
            'div',
            { className: 'tt-head' },
            h(
              'div',
              { className: 'tt-head-main' },
              h('span', { className: 'tt-head-mark' }, h(Icon, { size: 25 })),
              h(
                'div',
                { className: 'tt-head-copy' },
                h('h1', { className: 'tt-title' }, t('title')),
                h('div', { className: 'tt-sub' }, [t('subtitle'), projectLabel || providerLabel].join(' · ')),
              ),
            ),
            h(
              'div',
              { className: 'tt-head-actions' },
              tasks ? h('div', { className: 'tt-search-control', role: 'search' },
                searchOpen ? h('input', {
                  id: 'tt-task-search',
                  type: 'search',
                  className: 'tt-input tt-search',
                  'aria-label': t('taskSearch'),
                  placeholder: t('taskSearch'),
                  autoFocus: true,
                  value: query,
                  onChange: (event) => setQuery(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      closeSearch()
                    }
                  },
                }) : null,
                h('button', {
                  type: 'button',
                  className: 'tt-btn',
                  ref: searchButton,
                  'aria-expanded': searchOpen,
                  'aria-controls': searchOpen ? 'tt-task-search' : undefined,
                  onClick: () => searchOpen ? closeSearch() : setSearchOpen(true),
                }, h(ToolIcon, { name: 'search' }), t('search')),
              ) : null,
              h('button', { className: 'tt-btn', onClick: () => void loadTasks(), disabled: loading }, h(ToolIcon, { name: 'refresh' }), loading ? t('loading') : t('refresh')),
              h('button', { className: 'tt-btn', onClick: openSettings }, h(ToolIcon, { name: 'settings' }), t('settings')),
            ),
          ),
          h(
            'div',
            { className: 'tt-tabs tt-sources', role: 'group', 'aria-label': t('provider') },
            ['tapd', 'zentao', 'all'].map((key) =>
              h(
                'button',
                {
                  key,
                  className: 'tt-tab' + (provider === key ? ' tt-tab-on' : ''),
                  'aria-pressed': provider === key,
                  disabled: loading,
                  onClick: () => void switchProvider(key),
                },
                t('provider' + key[0].toUpperCase() + key.slice(1)),
              ),
            ),
          ),
          setupError
            ? h(
                'div',
                { className: 'tt-note' },
                h('div', { className: 'tt-note-title' }, t('needSetup')),
                h('div', null, t('needSetupHint')),
                h('button', { className: 'tt-btn tt-btn-primary', onClick: openSettings }, t('goSettings')),
              )
            : null,
          error && !setupError ? h(ErrorBox, { t, error, onRetry: () => void loadTasks() }) : null,
          syncError ? h('div', { className: 'tt-sync-note', role: 'status' }, `${t('syncFailed')} · ${syncError}`) : null,
          (tasks?.sourceErrors ?? []).map(({ provider: source, message }) =>
            h('div', { className: 'tt-sync-note', key: source, role: 'status' },
              `${t(source === 'tapd' ? 'providerTapd' : 'providerZentao')} · ${message}`)),
          (tasks?.projects ?? []).filter((entry) => !entry.ok).map((entry) =>
            h('div', { className: 'tt-sync-note', key: entry.id, role: 'status' },
              `TAPD · ${tasks.projectNames?.[entry.id] || entry.id} · ${entry.error}`)),
          loading && !tasks
            ? h('div', { className: 'tt-note' }, h('div', null, t('loading')))
            : null,
          tasks
            ? h(
                'div',
                { className: 'tt-toolbar' },
                h(
                  'div',
                  { className: 'tt-tabs tt-filters', role: 'group', 'aria-label': t('taskFilters') },
                  tab('open', t('filterOpen')),
                  tab('all', t('filterAll')),
                  tab('done', t('filterDone')),
                ),
                projects.size > 1 || project ? renderFilter(t('allProjects'), project, projects, setProject) : null,
                apps.size > 0 || app ? renderFilter(t('allApps'), app, [...apps].map((name) => [name, name]), setApp) : null,
                LIST_VIEW_ENABLED ? h('div', { className: 'tt-tabs tt-filters', role: 'group', 'aria-label': t('taskFilters') },
                  ['list', 'board'].map((key) => h('button', {
                    key,
                    className: 'tt-tab' + (view === key ? ' tt-tab-on' : ''),
                    'aria-pressed': view === key,
                    onClick: () => setView(key),
                  }, t(`${key}View`)))) : null,
                h('span', { className: 'tt-count' }, `${visible.length} / ${stories.length} ${t('storyCount')}`),
              )
            : null,
          tasks && visible.length === 0
            ? h(
                'div',
                { className: 'tt-note' },
                h('div', { className: 'tt-note-title' }, t('empty')),
                h('div', null, t(stories.length ? 'noMatches' : provider === 'zentao' && tasks.ownerFilteredEmpty ? 'zentaoUnassignedHint' : 'emptyHint')),
              )
            : null,
          view === 'board' && groups.length ? h('div', { className: 'tt-board' },
            groups.map((group) => h('section', { className: 'tt-board-column', key: group.name },
              h('h2', null, group.name, h('span', { className: 'tt-tab-total' }, group.stories.length)),
              h('div', { className: 'tt-board-cards' }, group.stories.map((story) => renderStory(TaskCard, story))),
            ))) : null,
          view === 'list' ? h(
            'div',
            { className: 'tt-list' },
            groups.map((group) =>
              h(
                'div',
                { className: 'tt-group', key: group.name || '__none__' },
                h(
                  'div',
                  { className: 'tt-group-head' },
                  h('span', null, group.name || t('iterationUnknown')),
                  group.range && group.range[0]
                    ? h('span', { className: 'tt-group-range' }, `${formatDate(group.range[0])} ~ ${formatDate(group.range[1])}`)
                    : null,
                  h('span', { className: 'tt-group-count' }, `${group.stories.length} ${t('storyCount')}`),
                ),
                h(
                  'div',
                  { className: showApp ? 'tt-shead' : 'tt-shead tt-noapp' },
                  showApp ? h('span', null, t('app')) : null,
                  h('span', null, 'ID'),
                  h('span', null, t('storyColumn')),
                  h('span', null, t('statusColumn')),
                  h('span', null, t('ownerColumn')),
                  h('span', { style: { textAlign: 'right' } }, t('actionColumn')),
                ),
                group.stories.map((story) => renderStory(StoryRow, story)),
              ),
            ),
          ) : null,
          boot
            ? h(
                'div',
                { className: 'tt-footer' },
                h('span', null, `${t('dataDir')}: ${boot.dataDir}`),
                h('span', null, `v${boot.version}`),
                boot.services
                  ? h(
                      'span',
                      null,
                      `registry:${boot.services.workspaceRegistry ? 'ok' : 'no'} · sessions:${boot.services.sessionController ? 'ok' : 'no'}`,
                    )
                  : null,
              )
            : null,
          toast ? h('div', { className: 'tt-toast' }, toast) : null,
        ),
        settingsOpen && boot
          ? h(SettingsModal, {
              t,
              boot,
              draft,
              setDraft,
              projectCatalog,
              projectBusy,
              projectError,
              onFetchProjects: () => void fetchProjectList(),
              projectsText,
              setProjectsText,
              zentaoCatalog,
              zentaoBusy,
              onFetchZentaoContainers: () => void fetchZentaoContainers(),
              saving,
              error: settingsError,
              onSave: () => void saveSettings(),
              onClose: () => setSettingsOpen(false),
            })
          : null,
        dialog
          ? h(DispatchModal, {
              t,
              story: dialog,
              boot,
              form,
              setForm,
              busy: dispatching,
              error: dispatchError,
              onSubmit: () => void submitDispatch(),
              onClose: () => {
                if (!dispatching) setDialog(null)
              },
            })
          : null,
        detail
          ? h(StoryDetailModal, {
              t,
              ...detail,
              story: detailStory,
              onClose: closeDetails,
              onSync: () => void openDetails(detailStory, detail),
              onOpen: (sessionId, dispatch) => {
                closeDetails()
                openTask(sessionId, dispatch)
              },
              onDispatch: (story) => {
                closeDetails()
                startDispatch(story)
              },
              onBackfill: backfillSupported || detailStory.dispatch?.draftPending
                ? (story) => {
                    closeDetails()
                    void backfillAssets(story)
                  }
                : undefined,
              backfilling,
            })
          : null,
      )
    }

    return {
      inject: ['slots', 'locale'],
      __test: { buildGroups, groupByStatus, filterStories, selectedProjectLabel, StoryRow, StoryDetailModal, SettingsModal, DispatchModal, Field },
      apply(ctx) {
        ctx.effect(() => ensureStyles(), 'dsh-task-hub: styles')
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-task-hub: dictionaries')
        const t = ctx.locale.bind(NS)
        // The dynamic Client ctx facade throws on an undeclared service
        // property read (it also reports a guard failure), so
        // `ctx.uiWorkspace ?? ctx.get('uiWorkspace')` aborted the whole
        // expression and the catch returned undefined — every 打开 click then
        // claimed the service was missing. ctx.get() is the optional lookup and
        // needs no inject declaration, so it must be the only path used here.
        const services = {
          uiWorkspace: () => {
            try {
              return ctx.get('uiWorkspace')
            } catch {
              return undefined
            }
          },
          workspaces: () => {
            try {
              return ctx.get('workspaces')
            } catch {
              return undefined
            }
          },
          sessions: () => {
            try {
              return ctx.get('sessions')
            } catch {
              return undefined
            }
          },
        }
        const isArchived = (sessionId) => {
          try {
            const store = services.workspaces()
            const snapshot = store?.list?.getSnapshot?.()
            return Array.isArray(snapshot?.archivedSessionIds) && snapshot.archivedSessionIds.includes(sessionId)
          } catch {
            return false
          }
        }
        // Returns a reason instead of failing silently so the panel can tell
        // the user why nothing happened.
        const openSession = async (sessionId) => {
          if (!sessionId) return { ok: false, reason: 'missing' }
          const ui = services.uiWorkspace()
          if (!ui || typeof ui.openSession !== 'function') return { ok: false, reason: 'service' }
          if (isArchived(sessionId)) {
            try {
              await ui.unarchiveSession?.(sessionId)
            } catch {
              return { ok: false, reason: 'error' }
            }
          }
          try {
            ui.openSession(sessionId)
            return { ok: true }
          } catch (error) {
            return { ok: false, reason: 'error', message: error?.message ?? String(error) }
          }
        }

        // The composer only accepts browser File objects, so a draft's photos
        // and attachments are streamed back from the host as bytes first.
        const assetFile = async (sessionId, asset, draftId) => {
          const response = await fetch(apiUrl('asset'), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ session: sessionId, i: asset.index, draftId }),
            cache: 'no-store',
            credentials: 'same-origin',
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const blob = await response.blob()
          return new File([blob], asset.name || `attachment-${asset.index}`, {
            type: asset.mediaType || blob.type || 'application/octet-stream',
          })
        }

        // The binding only exists once the workspace has retained the session,
        // which happens a moment after openSession() navigates to it.
        const waitForBinding = async (sessionsService, sessionId, timeoutMs = 8000) => {
          if (!sessionsService?.binding) return undefined
          const started = Date.now()
          while (Date.now() - started < timeoutMs) {
            const binding = sessionsService.binding(sessionId)
            if (binding) return binding
            await new Promise((resolve) => {
              setTimeout(resolve, 60)
            })
          }
          return undefined
        }

        // Fill a dispatched-but-unsent session's composer: the operator reads
        // the requirement and presses send. Nothing is submitted here.
        const prepareDraft = async (record) => {
          const sessionId = record?.sessionId
          const draft = record?.draft
          const missing = []
          if (!sessionId) return { ok: false, reason: 'missing' }
          const opened = await openSession(sessionId)
          if (!opened.ok) return opened
          if (!String(draft?.text ?? '').trim() && !(draft?.assets?.length > 0)) {
            return { ok: false, reason: 'empty' }
          }
          let conversation
          try {
            conversation = ctx.get('conversation')
          } catch {
            conversation = undefined
          }
          if (!conversation?.input?.requestDraftInitialization) return { ok: false, reason: 'service' }
          const binding = await waitForBinding(services.sessions(), sessionId)
          if (!binding) return { ok: false, reason: 'binding' }
          // The operator already sent something here: do not push the brief
          // back into a composer that now belongs to the conversation.
          const snapshot = binding.session?.getSnapshot?.()
          if (snapshot?.blank === false && !record.continuation) return { ok: true, applied: 'existing', attachments: 0, missing, alreadyStarted: true }
          const shell = conversation.input.shellFor?.(binding)
          const assets = Array.isArray(draft?.assets) ? draft.assets : []
          const prompt = String(draft?.text ?? '')
          // A refreshed brief carries the text the composer was seeded with
          // (`previousText`, plus `previousTextUpgraded` when the headings were
          // converted before the layout was compacted); any of those means the
          // operator has not edited the composer, so it may be replaced and the
          // attachments restored. Compare with trailing whitespace ignored: the
          // editor may normalize the seeded text.
          const sameText = (left, right) => String(left ?? '').trimEnd() === String(right ?? '').trimEnd()
          const previousTexts = [draft.previousText, draft.previousTextUpgraded].filter(Boolean)
          const untouchedText = (value) => sameText(value, prompt) || previousTexts.some((text) => sameText(value, text))
          let applied = 'blocked'
          for (let attempt = 0; attempt < 4 && applied === 'blocked'; attempt += 1) {
            if (attempt > 0) {
              await new Promise((resolve) => {
                setTimeout(resolve, 200)
              })
              // The composer may have been replaced while we waited.
              if (!services.sessions()?.binding?.(sessionId)) return { ok: false, reason: 'binding' }
            }
            try {
              const composer = shell?.snapshot
              // 'replace' swaps only the text and its inline references; the
              // chips already attached to the composer survive it, so a
              // composer that still holds the pre-upgrade text can be
              // refreshed even when it already shows attachments.
              const unedited = previousTexts.some((text) => sameText(composer?.draft, text))
              applied = conversation.input.requestDraftInitialization(binding, {
                prompt,
                whenDraftExists: unedited ? 'replace' : 'keep',
              })
            } catch (error) {
              return { ok: false, reason: 'draft', message: error?.message ?? String(error) }
            }
          }
          if (applied === 'blocked') return { ok: false, reason: 'blocked' }
          // Someone already typed into this composer: keep their text and do
          // not pile our attachments on top of it. An untouched composer that
          // still holds the previous draft is different: the attachments are
          // restored even when the text itself could not be refreshed.
          if (applied === 'preserved') {
            const composer = shell?.snapshot
            const restorable = Boolean(composer) &&
              composer.attachmentIds?.length === 0 &&
              untouchedText(String(composer.draft ?? ''))
            if (!assets.length || !restorable) {
              return { ok: true, applied, attachments: 0, missing, preserved: true }
            }
          }
          if (assets.length === 0) return { ok: true, applied, attachments: 0, missing }
          const files = []
          const failed = []
          for (const [index, asset] of assets.entries()) {
            try {
              files.push(await assetFile(sessionId, asset, draft.draftId))
            } catch {
              failed.push(asset.name || `附件 ${index + 1}`)
            }
          }
          if (files.length === 0) return { ok: true, applied, attachments: 0, missing: [...missing, ...failed] }
          const names = files.map((file) => file.name)
          // Attachments used to vanish without a word: the composer snapshot was
          // compared against an internal revision captured before the bytes
          // arrived, and the shell was read once, so a re-render (or a composer
          // that was mid-turn) silently dropped every file between 打开 and the
          // operator pressing send. Compare what the operator can actually see,
          // re-read the shell, and retry before giving up.
          const stageAttachments = async () => {
            const live = conversation.input.shellFor?.(binding) ?? shell
            const composer = live?.snapshot
            if (!composer) return { ok: false }
            if (!untouchedText(String(composer.draft ?? ''))) {
              return { preserved: true }
            }
            // Existing chips are kept by the replacement; adding our copies on
            // top would show every screenshot twice.
            if ((composer.attachmentIds?.length ?? 0) > 0) return { ok: true }
            const created = conversation.createDrafts?.(sessionId, files)
            const ids = (Array.isArray(created) ? created : []).map((item) => item?.id).filter(Boolean)
            if (ids.length !== files.length) return { ok: false }
            for (let attempt = 0; attempt < 3; attempt += 1) {
              if (attempt > 0) {
                await new Promise((resolve) => {
                  setTimeout(resolve, 150)
                })
              }
              const target = conversation.input.shellFor?.(binding) ?? live
              if (target?.addAttachments?.(ids) === true) return { ok: true, ids }
            }
            return { ok: false }
          }
          let staged
          try {
            staged = await stageAttachments()
          } catch (error) {
            return {
              ok: true,
              applied,
              attachments: 0,
              missing: [...missing, ...failed, ...names],
              message: error?.message ?? String(error),
            }
          }
          if (staged.preserved) {
            return { ok: true, applied, attachments: 0, missing: [...missing, ...failed], preserved: true }
          }
          if (!staged.ok) {
            return { ok: true, applied, attachments: 0, missing: [...missing, ...failed, ...names], reason: 'composer' }
          }
          return { ok: true, applied, attachments: Array.isArray(staged.ids) ? staged.ids.length : 0, missing: [...missing, ...failed] }
        }

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
              inject: () => ({ t, openSession, prepareDraft }),
            },
            Panel,
          ),
        )
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 25,
              label: () => t('nav'),
              locale: NS,
            },
            (owner = {}) => h(Icon, { size: owner.size || 16 }),
          ),
        )
      },
    }
  },
})
