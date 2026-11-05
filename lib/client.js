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

    const zh = {
      nav: '任务中心',
      title: '任务中心',
      subtitle: '分配给我的任务',
      taskFilters: '任务筛选',
      provider: '需求来源',
      providerTapd: 'TAPD',
      providerZentao: '禅道',
      providerHint: '一次只读取一个来源；TAPD、禅道任选其一，各自的配置会保留。',
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
      dispatchPromptHint: '会追加在自动生成的任务说明后面，不会替换需求正文；留空则只发送自动生成的那一份。',
      dispatchPromptPlaceholder: '例如：只改后端导出接口，不要动前端；完成后列出改动的接口。',
      dispatchConfirm: '建分支并放进输入框',
      dispatching: '正在派发…',
      dispatched: '已派发',
      draftReady: '已放进输入框，确认后自行发送',
      draftFailed: '会话已建好，但内容没能放进输入框，请打开会话手动粘贴。',
      draftPartial: '会话已建好，{n} 个附件没能放进输入框，请手动补上。',
      running: '运行中',
      idle: '空闲',
      story: '需求',
      owner: '处理人',
      due: '截止',
      app: '应用',
      priority: '优先级',
      status: '状态',
      iteration: '迭代',
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
      excludeCompleted: '隐藏已完成需求',
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
      provider: 'Source',
      providerTapd: 'TAPD',
      providerZentao: 'ZenTao',
      providerHint: 'One source at a time — pick TAPD or ZenTao; each keeps its own settings.',
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
      dispatchPromptHint: 'Appended after the generated task brief; the story text is kept. Leave empty to send the brief as is.',
      dispatchPromptPlaceholder: 'e.g. backend export endpoint only, no UI changes; list the changed endpoints when done.',
      dispatchConfirm: 'Create branch and prefill',
      dispatching: 'Dispatching…',
      dispatched: 'Dispatched',
      draftReady: 'Loaded into the composer — send it yourself when ready',
      draftFailed: 'The session is ready, but the text could not be placed in the composer; paste it manually.',
      draftPartial: 'The session is ready, but {n} attachment(s) could not be placed in the composer.',
      running: 'Running',
      idle: 'Idle',
      story: 'Story',
      owner: 'Owner',
      due: 'Due',
      app: 'App',
      priority: 'Priority',
      status: 'Status',
      iteration: 'Iteration',
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
      excludeCompleted: 'Hide completed stories',
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
  padding: 28px clamp(14px, 3vw, 40px) 44px;
  background: color-mix(in srgb, var(--tt-text) 3%, var(--tt-canvas));
  color: var(--tt-text);
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  container: tt-panel / inline-size;
}
.tt-shell { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
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
.tt-toast { position: sticky; bottom: 0; align-self: center; background: var(--tt-surface); border: 1px solid var(--tt-line); color: var(--tt-text); box-shadow: var(--tt-shadow); font-size: 12px; border-radius: 10px; padding: 7px 14px; }
.tt-muted { color: var(--tt-secondary); }
.tt-seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 3px; background: var(--tt-fill); border: 1px solid var(--tt-line); border-radius: 9px; }
.tt-seg button { appearance: none; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--tt-secondary); font: inherit; font-size: 12px; padding: 4px 10px; cursor: pointer; }
.tt-seg button.tt-seg-on { background: var(--tt-surface); color: var(--tt-text); border-color: var(--tt-line); box-shadow: 0 1px 3px rgb(0 0 0 / 8%); font-weight: 550; }
.tt-group { border: 1px solid var(--tt-line); border-radius: 14px; background: var(--tt-surface); box-shadow: var(--tt-shadow); overflow: hidden; }
.tt-group-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 10px; padding: 12px 16px; font-size: 13.5px; font-weight: 650; overflow-wrap: anywhere; }
.tt-group-range, .tt-group-count { color: var(--tt-secondary); font-weight: 400; font-size: 11px; font-variant-numeric: tabular-nums; }
.tt-group-count { margin-inline-start: auto; white-space: nowrap; }
.tt-shead, .tt-srow { display: grid; grid-template-columns: 122px 78px minmax(0, 1fr) 126px 70px 176px; gap: 10px; align-items: center; padding: 11px 16px; }
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
      refresh: 'M20 7v5h-5M20 12a8 8 0 1 0-2.2 5.5',
      settings: 'M4 7h6m4 0h6M4 17h10m4 0h2M10 5v4m4 6v4',
      close: 'm6 6 12 12M18 6 6 18',
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
          { className: 'tt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title },
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
      if (!props.dispatch) return null
      if (props.dispatch.sessionMissing) {
        return h('span', { className: 'tt-chip tt-chip-warn' }, t('noSession'))
      }
      return h(
        'span',
        { className: 'tt-chip ' + (props.dispatch.running ? 'tt-chip-ok' : 'tt-chip-idle') },
        h('span', { className: 'tt-dot' }),
        props.dispatch.running ? t('running') : t('idle'),
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
      return story.vStatus || story.status || ''
    }

    function storyTone(story) {
      return STATUS_TONE[story.status] ?? 'tt-status-open'
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

    function StoryRow(props) {
      const { story, t, onDispatch, onOpen, onBackfill, backfilling, showApp } = props
      const dispatch = story.dispatch
      const refreshDraft = story.source === 'zentao' && dispatch?.draft && !dispatch.draft.detailsLoaded
      const tags = showApp ? appTags(story.app) : []
      const meta = []
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
            'a',
            {
              className: 'tt-story-title',
              href: story.url || undefined,
              target: '_blank',
              rel: 'noreferrer noopener',
              title: t('openTAPD'),
            },
            story.name,
          ),
          meta.length > 0 ? h('div', { className: 'tt-smeta' }, meta) : null,
        ),
        h('div', { className: 'tt-sstatus' }, storyStatus(story) ? h('span', { className: 'tt-status ' + storyTone(story) }, storyStatus(story)) : null),
        h('div', { className: 'tt-sowner', title: story.owner }, story.owner),
        h(
          'div',
          { className: 'tt-srow-action' },
          h(StatePill, { t, dispatch }),
          dispatch ? (
            dispatch.sessionMissing
              ? h(
                  'button',
                  {
                    className: 'tt-btn tt-btn-primary tt-btn-small',
                    title: t('sessionGoneHint'),
                    onClick: () => onDispatch(story),
                  },
                  t('redispatch'),
                )
              : h(
                  'div',
                  { className: 'tt-srow-buttons' },
                  h(
                    'button',
                    { className: 'tt-btn tt-btn-small', onClick: () => onOpen(dispatch.sessionId, dispatch) },
                    t('openShort'),
                  ),
                  story.source !== 'tapd' &&
                  (refreshDraft || !(dispatch.draft?.detailsLoaded || dispatch.attachments?.length || dispatch.images?.length || dispatch.draft?.assets?.length)) &&
                  typeof onBackfill === 'function'
                    ? h(
                        'button',
                        {
                          className: 'tt-btn tt-btn-small',
                          title: t(refreshDraft ? 'refreshDraftHint' : 'backfillHint'),
                          disabled: backfilling === (story.uid ?? story.id),
                          onClick: () => onBackfill(story),
                        },
                        backfilling === (story.uid ?? story.id) ? t('backfilling') : t(refreshDraft ? 'refreshDraft' : 'backfill'),
                      )
                    : null,
                )
          ) : (
            h('button', { className: 'tt-btn tt-btn-primary tt-btn-small', onClick: () => onDispatch(story) }, t('dispatch'))
          ),
        ),
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
      return h(
        Modal,
        { t, title: t('dispatchTitle'), onClose },
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
          h(Field, { label: t('dispatchPrompt'), hint: t('dispatchPromptHint') }, h('textarea', {
            className: 'tt-textarea',
            placeholder: t('dispatchPromptPlaceholder'),
            value: form.prompt,
            onChange: (event) => setForm({ ...form, prompt: event.target.value }),
          })),
          error ? h(ErrorBox, { t, error }) : null,
          h(
            'div',
            { className: 'tt-modal-foot' },
            h('button', { className: 'tt-btn', onClick: onClose, disabled: busy }, t('cancel')),
            h('button', { className: 'tt-btn tt-btn-primary', onClick: onSubmit, disabled: busy }, busy ? t('dispatching') : t('dispatchConfirm')),
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
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [draft, setDraft] = React.useState({
        provider: 'tapd',
        authMode: 'token',
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

      // A task dispatched as a draft keeps its requirement in the record, so
      // opening it again restores the composer instead of showing an empty one.
      const openTask = (sessionId, dispatch) => {
        if (!sessionId) return
        if (dispatch?.draft?.text && typeof prepareDraft === 'function') {
          Promise.resolve(prepareDraft({ sessionId, draft: dispatch.draft }))
            .then((result) => {
              if (alive.current && result && !result.ok) setToast(t('draftFailed'))
            })
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

      const loadTasks = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
          const result = await api('tasks')
          if (!alive.current) return
          setTasks(result)
        } catch (failure) {
          if (!alive.current) return
          setError({ message: failure.message, code: failure.code })
          setTasks(null)
        } finally {
          if (alive.current) setLoading(false)
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
                  const entry = byUid[story.uid] ?? byUid[story.id]
                  if (!entry) return story
                  return {
                    ...story,
                    dispatch: {
                      ...(story.dispatch ?? {}),
                      sessionId: entry.sessionId,
                      branch: entry.branch,
                      workspaceId: entry.workspaceId,
                      createdAt: entry.createdAt,
                      running: Boolean(entry.running),
                      sessionMissing: Boolean(entry.sessionMissing),
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
        if (provider === (boot?.settings?.provider ?? 'tapd')) return
        setLoading(true)
        try {
          const next = await api('settings', { provider })
          if (!alive.current) return
          applyBoot(next)
          await loadTasks()
        } catch (failure) {
          if (!alive.current) return
          setError({ message: failure.message, code: failure.code })
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
        setForm({
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

      const submitDispatch = async () => {
        if (!dialog) return
        setDispatching(true)
        setDispatchError(null)
        try {
          const branchName = form.branchName.trim()
          if (!branchName) {
            setDispatchError({ message: t('dispatchBranchRequired'), code: 'dispatch/missing-branch' })
            setDispatching(false)
            return
          }
          const body = {
            storyId: dialog.id,
            uid: dialog.uid,
            projectId: dialog.projectId,
            branchName,
            story: { ...dialog, dispatch: undefined },
            useWorktree: Boolean(form.useWorktree),
            smartCheckout: form.smartCheckout !== false,
            baseBranch: form.baseBranch.trim(),
            extraInstructions: form.prompt.trim(),
          }
          if (form.mode === 'custom') body.workspacePath = form.workspacePath.trim()
          else body.workspaceId = form.workspaceId
          const record = await api('dispatch', body)
          if (!alive.current) return
          setDialog(null)
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
                        createdAt: record.createdAt,
                        running: !isDraft,
                        status: record.status ?? '',
                        draft: record.draft ?? null,
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
          const refreshDraft = story.source === 'zentao' && Boolean(story.dispatch?.draft)
          const record = await api('dispatch', {
            storyId: story.id,
            uid: story.uid,
            projectId: story.projectId,
            story: { ...story, dispatch: undefined },
            refreshDraft,
            deliver: refreshDraft ? 'draft' : 'send',
          })
          if (!alive.current) return
          if (refreshDraft && record.draft?.detailsLoaded) {
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
      const visible = stories.filter((story) => {
        if (filter === 'open') return !story.completed
        if (filter === 'done') return Boolean(story.completed)
        return true
      })
      const counts = {
        all: stories.length,
        open: stories.filter((story) => !story.completed).length,
        done: stories.filter((story) => Boolean(story.completed)).length,
      }
      const groups = buildGroups(visible, tasks?.iterations ?? [])
      const showApp = visible.some((story) => appTags(story.app).length > 0)
      const setupError = Boolean(
        error &&
          (error.code.endsWith('/missing-credentials') ||
            error.code.endsWith('/missing-base-url') ||
            error.code.endsWith('/missing-container') ||
            error.code.endsWith('/missing-projects') ||
            error.code.endsWith('/missing-nick')),
      )
      const provider = tasks?.provider ?? boot?.settings?.provider ?? 'tapd'
      const providerLabel = t('provider' + provider[0].toUpperCase() + provider.slice(1))
      const zentaoSettings = boot?.settings?.zentao
      const projectLabel =
        provider === 'tapd'
          ? selectedProjectLabel(tasks, boot)
          : (zentaoSettings?.containerIds ?? []).map((id) => zentaoSettings.containerNames?.[id] || id).join(' · ')

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
              h('button', { className: 'tt-btn', onClick: () => void loadTasks(), disabled: loading }, h(ToolIcon, { name: 'refresh' }), loading ? t('loading') : t('refresh')),
              h('button', { className: 'tt-btn', onClick: openSettings }, h(ToolIcon, { name: 'settings' }), t('settings')),
            ),
          ),
          h(
            'div',
            { className: 'tt-tabs tt-sources', role: 'group', 'aria-label': t('provider') },
            ['tapd', 'zentao'].map((key) =>
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
                h('span', { className: 'tt-count' }, `${visible.length} / ${stories.length} ${t('storyCount')}`),
              )
            : null,
          tasks && visible.length === 0
            ? h(
                'div',
                { className: 'tt-note' },
                h('div', { className: 'tt-note-title' }, t('empty')),
                h('div', null, t(provider === 'zentao' && tasks.ownerFilteredEmpty ? 'zentaoUnassignedHint' : 'emptyHint')),
              )
            : null,
          h(
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
                group.stories.map((story) =>
                  h(StoryRow, {
                    key: story.uid ?? story.id,
                    story,
                    t,
                    showApp,
                    onDispatch: startDispatch,
                    onBackfill: backfillSupported ? backfillAssets : undefined,
                    backfilling,
                    onOpen: openTask,
                  }),
                ),
              ),
            ),
          ),
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
      )
    }

    return {
      inject: ['slots', 'locale'],
      __test: { buildGroups, selectedProjectLabel, StoryRow, SettingsModal, DispatchModal, Field },
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
        const assetFile = async (sessionId, asset) => {
          const response = await fetch(apiUrl('asset'), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ session: sessionId, i: asset.index }),
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
          if (snapshot?.blank === false) return { ok: true, applied: 'existing', attachments: 0, missing, alreadyStarted: true }
          const shell = conversation.input.shellFor?.(binding)
          const assets = Array.isArray(draft?.assets) ? draft.assets : []
          const prompt = String(draft?.text ?? '')
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
              const unedited = Boolean(draft.previousText && composer?.draft === draft.previousText && composer?.attachmentIds?.length === 0)
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
          // not pile our attachments on top of it.
          if (applied === 'preserved') {
            const composer = shell?.snapshot
            if (!assets.length || composer?.draft !== prompt || composer?.attachmentIds?.length !== 0) {
              return { ok: true, applied, attachments: 0, missing, preserved: true }
            }
          }
          if (assets.length === 0) return { ok: true, applied, attachments: 0, missing }
          const draftRevision = shell?.snapshot?.draftRev
          const files = []
          for (const asset of assets) {
            try {
              files.push(await assetFile(sessionId, asset))
            } catch {
              missing.push(asset.name)
            }
          }
          if (files.length === 0) return { ok: true, applied, attachments: 0, missing }
          let ids = []
          try {
            const composer = shell?.snapshot
            if (composer && (composer.draftRev !== draftRevision || composer.attachmentIds?.length > 0)) {
              return { ok: true, applied, attachments: 0, missing, preserved: true }
            }
            const created = conversation.createDrafts?.(sessionId, files)
            ids = (Array.isArray(created) ? created : []).map((item) => item?.id).filter(Boolean)
            if (ids.length !== files.length || shell?.addAttachments?.(ids) !== true) {
              return { ok: true, applied, attachments: 0, missing: [...missing, ...files.map((file) => file.name)] }
            }
          } catch (error) {
            return {
              ok: true,
              applied,
              attachments: 0,
              missing: [...missing, ...files.map((file) => file.name)],
              message: error?.message ?? String(error),
            }
          }
          return { ok: true, applied, attachments: ids.length, missing }
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
