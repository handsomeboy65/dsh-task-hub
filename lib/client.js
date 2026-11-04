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
    const POLL_MS = 8000

    const zh = {
      nav: '任务中心',
      title: '任务中心',
      subtitle: '处理人是我 · TAPD / 禅道 / GitLab',
      provider: '需求来源',
      providerTapd: 'TAPD',
      providerZentao: '禅道',
      providerGitlab: 'GitLab',
      providerHint: '一次只读取一个来源；TAPD、禅道、GitLab 任选其一，各自的配置会保留。',
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
      zentaoAccount: '禅道账号',
      zentaoPassword: '禅道密码',
      zentaoPasswordSaved: '密码已配置，留空表示不修改',
      zentaoPasswordMissing: '未配置密码',
      zentaoScope: '读取范围',
      zentaoScopeProduct: '产品需求',
      zentaoScopeProject: '项目任务',
      zentaoContainer: '产品 / 项目',
      zentaoContainerHint: '先读取列表再选择，也可以直接填 ID。',
      zentaoFetchContainers: '读取产品 / 项目',
      zentaoFetchingContainers: '正在读取…',
      zentaoNoContainers: '没有读取到产品/项目，检查账号密码与地址',
      zentaoContainerRequired: '请选择禅道产品/项目',
      gitlabBaseUrl: 'GitLab 地址',
      gitlabBaseUrlHint: '支持 gitlab.com、极狐 GitLab 与自建实例。',
      gitlabToken: 'GitLab 访问令牌',
      gitlabTokenHint: '需要 read_api 权限，保存后只显示是否已配置。',
      gitlabTokenSaved: '令牌已配置，留空表示不修改',
      gitlabTokenMissing: '未配置令牌',
      gitlabProject: '项目路径（可选）',
      gitlabProjectHint: '例如 group/project；留空读取整个实例上分配给我的 Issue。',
      gitlabLabels: '标签过滤（可选）',
      gitlabLabelsHint: '多个标签用逗号分隔，只显示同时带这些标签的 Issue。',
      dispatchBranch: '分支名称',
      dispatchBranchHint: '填写完整分支名，例如 feature/order-export；不会再自动拼接需求编号。',
      dispatchBranchRequired: '请先填写完整的分支名称',
      excludeCompleted: '隐藏已完成需求',
      saveDone: '已保存',
      dispatchDone: '已派发，正在打开会话…',
      viewTAPD: '在 TAPD 打开',
      errorGeneric: '出错了',
      unfilteredHint: 'TAPD 返回了需求，但按处理人过滤后为空；检查「处理人昵称」。',
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
      subtitle: 'Assigned to me · TAPD / ZenTao / GitLab',
      provider: 'Source',
      providerTapd: 'TAPD',
      providerZentao: 'ZenTao',
      providerGitlab: 'GitLab',
      providerHint: 'One source at a time — pick TAPD, ZenTao or GitLab; each keeps its own settings.',
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
      zentaoAccount: 'ZenTao account',
      zentaoPassword: 'ZenTao password',
      zentaoPasswordSaved: 'Password configured — leave empty to keep it',
      zentaoPasswordMissing: 'No password configured',
      zentaoScope: 'Read from',
      zentaoScopeProduct: 'Product stories',
      zentaoScopeProject: 'Project tasks',
      zentaoContainer: 'Product / project',
      zentaoContainerHint: 'Load the list and pick one, or type the id directly.',
      zentaoFetchContainers: 'Load products / projects',
      zentaoFetchingContainers: 'Loading…',
      zentaoNoContainers: 'No products or projects returned — check URL and credentials',
      zentaoContainerRequired: 'Pick a ZenTao product/project',
      gitlabBaseUrl: 'GitLab URL',
      gitlabBaseUrlHint: 'Works with gitlab.com, JiHu GitLab and self-hosted instances.',
      gitlabToken: 'GitLab access token',
      gitlabTokenHint: 'Needs read_api; after saving only the configured flag is shown.',
      gitlabTokenSaved: 'Token configured — leave empty to keep it',
      gitlabTokenMissing: 'No token configured',
      gitlabProject: 'Project path (optional)',
      gitlabProjectHint: 'For example group/project; leave empty for all issues assigned to me.',
      gitlabLabels: 'Label filter (optional)',
      gitlabLabelsHint: 'Comma separated; only issues carrying all labels are listed.',
      dispatchBranch: 'Branch name',
      dispatchBranchHint: 'Type the full branch, e.g. feature/order-export; the story id is never appended.',
      dispatchBranchRequired: 'Enter the full branch name first',
      excludeCompleted: 'Hide completed stories',
      saveDone: 'Saved',
      dispatchDone: 'Dispatched; opening the session…',
      viewTAPD: 'Open in TAPD',
      errorGeneric: 'Something went wrong',
      unfilteredHint: 'TAPD returned stories but the owner filter matched none; check the owner nickname.',
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
.tt-root { height: 100%; overflow: auto; padding: 22px 26px 48px; color: var(--dsw-alias-label-primary); }
.tt-shell { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.tt-head { display: flex; align-items: flex-start; gap: 12px; }
.tt-head-main { flex: 1; min-width: 0; }
.tt-title { font-size: 18px; font-weight: 600; letter-spacing: .01em; }
.tt-sub { margin-top: 3px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.tt-head-actions { display: flex; gap: 8px; align-items: center; }
.tt-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: 7px; padding: 5px 11px; font-size: 12px; cursor: pointer; line-height: 1.5; }
.tt-btn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); }
.tt-btn:disabled { opacity: .55; cursor: default; }
.tt-btn-primary { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); font-weight: 500; }
.tt-btn-ghost { background: transparent; }
.tt-btn-small { padding: 3px 9px; font-size: 11px; }
.tt-tabs { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tt-tab { border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 999px; padding: 3px 11px; font-size: 12px; cursor: pointer; }
.tt-tab-on { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l1); color: var(--dsw-alias-label-primary); }
.tt-count { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-left: auto; }
.tt-list { display: flex; flex-direction: column; gap: 8px; }
.tt-card { display: flex; gap: 14px; padding: 13px 15px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.tt-card:hover { border-color: var(--dsw-alias-border-l2); }
.tt-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.tt-story-title { font-size: 14px; font-weight: 500; color: var(--dsw-alias-label-primary); text-decoration: none; line-height: 1.45; overflow-wrap: anywhere; }
.tt-story-title:hover { color: var(--dsw-alias-brand-primary); }
.tt-meta { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 11px; color: var(--dsw-alias-label-secondary); align-items: center; }
.tt-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); font-size: 11px; }
.tt-chip-id { font-variant-numeric: tabular-nums; }
.tt-chip-app { max-width: 100%; }
.tt-chip-warn { color: var(--dsw-alias-state-warn-primary); }
.tt-chip-ok { color: var(--dsw-alias-state-success-primary); }
.tt-chip-idle { color: var(--dsw-alias-state-idle-primary); }
.tt-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; display: inline-block; }
.tt-card-side { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 8px; flex: 0 0 auto; }
.tt-dispatch-info { font-size: 11px; color: var(--dsw-alias-label-secondary); text-align: right; max-width: 210px; }
.tt-branch { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--dsw-alias-label-primary); }
.tt-note { border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px; padding: 18px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 12px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.tt-note-title { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; }
.tt-error { border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 10px; padding: 12px 14px; font-size: 12px; display: flex; flex-direction: column; gap: 6px; }
.tt-error-msg { color: var(--dsw-alias-label-primary); }
.tt-error-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
.tt-footer { font-size: 11px; color: var(--dsw-alias-label-secondary); display: flex; gap: 12px; flex-wrap: wrap; }
.tt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.42); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 60; }
.tt-modal { width: min(620px, 100%); max-height: 86vh; overflow: auto; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
.tt-modal-head { display: flex; align-items: center; gap: 10px; }
.tt-modal-title { font-size: 15px; font-weight: 600; flex: 1; }
.tt-field { display: flex; flex-direction: column; gap: 5px; }
.tt-label { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.tt-input, .tt-select, .tt-textarea { width: 100%; box-sizing: border-box; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; padding: 6px 9px; outline: none; }
.tt-input:focus, .tt-select:focus, .tt-textarea:focus { border-color: var(--dsw-alias-brand-primary); }
.tt-textarea { min-height: 84px; resize: vertical; font-size: 12.5px; line-height: 1.5; }
.tt-hint { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.tt-check { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; }
.tt-check input { margin-top: 2px; }
.tt-modal-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
.tt-stack { display: flex; flex-direction: column; gap: 12px; }
.tt-row { display: flex; gap: 10px; }
.tt-row > * { flex: 1; min-width: 0; }
.tt-toast { position: sticky; bottom: 0; align-self: center; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); font-size: 12px; border-radius: 8px; padding: 7px 14px; }
.tt-muted { color: var(--dsw-alias-label-secondary); }
.tt-story-desc { font-size: 11.5px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tt-seg { display: inline-flex; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; overflow: hidden; }
.tt-seg button { appearance: none; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; padding: 5px 12px; cursor: pointer; }
.tt-seg button + button { border-left: 1px solid var(--dsw-alias-border-l1); }
.tt-seg button.tt-seg-on { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 500; }
.tt-group { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.tt-group-head { display: flex; align-items: center; gap: 10px; padding: 9px 14px; background: var(--dsw-alias-bg-layer-2); border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 12.5px; font-weight: 500; }
.tt-group-range { color: var(--dsw-alias-label-secondary); font-weight: 400; font-size: 11px; }
.tt-group-count { margin-left: auto; color: var(--dsw-alias-label-secondary); font-weight: 400; font-size: 11px; }
.tt-shead, .tt-srow { display: grid; grid-template-columns: 128px 104px minmax(0, 1fr) 132px 92px 118px; gap: 14px; align-items: center; padding: 9px 14px; }
.tt-shead.tt-noapp, .tt-srow.tt-noapp { grid-template-columns: 104px minmax(0, 1fr) 132px 92px 118px; }
.tt-shead { font-size: 11px; color: var(--dsw-alias-label-secondary); border-bottom: 1px solid var(--dsw-alias-border-l1); padding-top: 6px; padding-bottom: 6px; }
.tt-srow { border-top: 1px solid var(--dsw-alias-border-l1); }
.tt-srow:first-of-type { border-top: 0; }
.tt-srow:hover { background: var(--dsw-alias-bg-layer-2); }
.tt-sapp { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.tt-sapp .tt-chip-app { max-width: 100%; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-sid { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 12px; color: var(--dsw-alias-label-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.tt-smain { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tt-smeta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.tt-status { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; padding: 2px 8px; border-radius: 999px; border: 1px solid currentColor; width: fit-content; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-status-open { color: var(--dsw-alias-brand-primary); }
.tt-status-done { color: var(--dsw-alias-state-success-primary); }
.tt-status-rejected { color: var(--dsw-alias-state-idle-primary); }
.tt-srow-action { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.tt-proj { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; padding: 10px 12px; }
.tt-proj-row { display: flex; gap: 9px; align-items: flex-start; font-size: 12px; }
.tt-proj-row input { margin-top: 2px; }
.tt-proj-name { font-weight: 500; }
.tt-proj-id { color: var(--dsw-alias-label-secondary); font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.tt-proj-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
@media (max-width: 760px) {
  .tt-shead, .tt-srow { grid-template-columns: 120px 84px minmax(0, 1fr) 112px 104px; }
  .tt-shead:not(.tt-noapp) > :nth-child(5), .tt-srow:not(.tt-noapp) > :nth-child(5) { display: none; }
  .tt-shead.tt-noapp, .tt-srow.tt-noapp { grid-template-columns: 88px minmax(0, 1fr) 112px 104px; }
  .tt-shead.tt-noapp > :nth-child(4), .tt-srow.tt-noapp > :nth-child(4) { display: none; }
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

    function Field(props) {
      return h(
        'label',
        { className: 'tt-field' },
        h('span', { className: 'tt-label' }, props.label),
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
          { className: 'tt-modal', role: 'dialog', 'aria-modal': 'true' },
          h(
            'div',
            { className: 'tt-modal-head' },
            h('div', { className: 'tt-modal-title' }, props.title),
            h(
              'button',
              { className: 'tt-btn tt-btn-ghost tt-btn-small', onClick: props.onClose },
              props.t('close'),
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
      planning: 'tt-status-open',
      developing: 'tt-status-open',
      testing: 'tt-status-open',
      resolved: 'tt-status-done',
      done: 'tt-status-done',
      closed: 'tt-status-done',
      rejected: 'tt-status-rejected',
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
      const tags = showApp ? appTags(story.app) : []
      const meta = []
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
        h('div', null, storyStatus(story) ? h('span', { className: 'tt-status ' + storyTone(story) }, storyStatus(story)) : null),
        h('div', { className: 'tt-muted', style: { fontSize: '11.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, story.owner),
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
                  { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end' } },
                  h(
                    'button',
                    { className: 'tt-btn tt-btn-small', onClick: () => onOpen(dispatch.sessionId, dispatch) },
                    t('openShort'),
                  ),
                  !(dispatch.attachments?.length || dispatch.images?.length || dispatch.draft?.assets?.length) &&
                  typeof onBackfill === 'function'
                    ? h(
                        'button',
                        {
                          className: 'tt-btn tt-btn-small',
                          title: t('backfillHint'),
                          disabled: backfilling === (story.uid ?? story.id),
                          onClick: () => onBackfill(story),
                        },
                        backfilling === (story.uid ?? story.id) ? t('backfilling') : t('backfill'),
                      )
                    : null,
                )
          ) : (
            h('button', { className: 'tt-btn tt-btn-primary tt-btn-small', onClick: () => onDispatch(story) }, t('dispatch'))
          ),
        ),
      )
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
      const gitlab = draft.gitlab ?? {}
      const setZentao = (patch) => setDraft({ ...draft, zentao: { ...zentao, ...patch } })
      const setGitlab = (patch) => setDraft({ ...draft, gitlab: { ...gitlab, ...patch } })
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
        h(Field, { label: t('zentaoBaseUrl'), hint: t('zentaoBaseUrlHint') }, h('input', {
          className: 'tt-input',
          value: zentao.baseUrl ?? '',
          onChange: (event) => setZentao({ baseUrl: event.target.value }),
          placeholder: 'https://zentao.example.com',
        })),
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
                value: zentao.scope ?? 'product',
                onChange: (event) => setZentao({ scope: event.target.value }),
              },
              h('option', { value: 'product' }, t('zentaoScopeProduct')),
              h('option', { value: 'project' }, t('zentaoScopeProject')),
            ),
          ),
          h(Field, { label: t('zentaoContainer'), hint: t('zentaoContainerHint') }, h('input', {
            className: 'tt-input',
            value: zentao.containerId ?? '',
            onChange: (event) => setZentao({ containerId: event.target.value }),
            placeholder: '1',
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
              zentaoBusy ? t('zentaoFetchingContainers') : t('zentaoFetchContainers'),
            ),
            h('span', { className: 'tt-hint' }, zentao.containerName || zentao.containerId || t('zentaoContainerHint')),
          ),
          zentaoCatalog.length > 0
            ? zentaoCatalog.map((item) =>
                h(
                  'label',
                  { className: 'tt-proj-row', key: `${item.kind}:${item.id}` },
                  h('input', {
                    type: 'radio',
                    name: 'tt-zentao-container',
                    checked: String(zentao.containerId ?? '') === String(item.id),
                    onChange: () => setZentao({ containerId: item.id, containerName: item.name }),
                  }),
                  h(
                    'span',
                    null,
                    h('span', { className: 'tt-proj-name' }, item.name),
                    h('div', { className: 'tt-proj-id' }, `${item.kind === 'product' ? t('zentaoScopeProduct') : t('zentaoScopeProject')} · ${item.id}`),
                  ),
                ),
              )
            : h('span', { className: 'tt-hint' }, projectError ? projectError : t('zentaoNoContainers')),
        ),
      )
      const gitlabSection = h(
        React.Fragment,
        null,
        h(Field, { label: t('gitlabBaseUrl'), hint: t('gitlabBaseUrlHint') }, h('input', {
          className: 'tt-input',
          value: gitlab.baseUrl ?? '',
          onChange: (event) => setGitlab({ baseUrl: event.target.value }),
          placeholder: 'https://gitlab.com',
        })),
        h(
          Field,
          {
            label: t('gitlabToken'),
            hint: boot?.credentials?.gitlab?.token ? t('gitlabTokenSaved') : t('gitlabTokenHint'),
          },
          h('input', {
            className: 'tt-input',
            type: 'password',
            value: gitlab.token ?? '',
            onChange: (event) => setGitlab({ token: event.target.value }),
            placeholder: boot?.credentials?.gitlab?.token ? '••••••••••••' : '',
            autoComplete: 'new-password',
          }),
        ),
        h(
          'div',
          { className: 'tt-row' },
          h(Field, { label: t('gitlabProject'), hint: t('gitlabProjectHint') }, h('input', {
            className: 'tt-input',
            value: gitlab.projectPath ?? '',
            onChange: (event) => setGitlab({ projectPath: event.target.value }),
            placeholder: 'group/project',
          })),
          h(Field, { label: t('gitlabLabels'), hint: t('gitlabLabelsHint') }, h('input', {
            className: 'tt-input',
            value: gitlab.labels ?? '',
            onChange: (event) => setGitlab({ labels: event.target.value }),
            placeholder: 'backend, urgent',
          })),
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
              providerButton('gitlab', t('providerGitlab')),
            ),
          ),
          provider === 'tapd' ? tapdSection : null,
          provider === 'zentao' ? zentaoSection : null,
          provider === 'gitlab' ? gitlabSection : null,
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
              checked: draft.useWorktree,
              onChange: (event) => setDraft({ ...draft, useWorktree: event.target.checked }),
            }),
            h('span', null, t('dispatchWorktree')),
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
          h('div', { className: 'tt-story-title' }, story.name),
          h(
            'div',
            { className: 'tt-meta' },
            h('span', { className: 'tt-chip tt-chip-id' }, `#${story.shortId || story.id}`),
            story.source ? h('span', { className: 'tt-chip' }, t('provider' + story.source[0].toUpperCase() + story.source.slice(1))) : null,
            story.status ? h('span', { className: 'tt-chip' }, story.status) : null,
            story.app ? h('span', { className: 'tt-chip', title: `${t('app')}：${story.app}` }, `${t('app')}：${story.app}`) : null,
          ),
          h(Field, { label: t('dispatchBranch'), hint: t('dispatchBranchHint') }, h('input', {
            className: 'tt-input',
            value: form.branchName,
            onChange: (event) => setForm({ ...form, branchName: event.target.value }),
            placeholder: 'feature/order-export',
            autoComplete: 'off',
          })),
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
              h('div', { className: 'tt-hint' }, t('dispatchWorktreeHint')),
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
                  h('div', { className: 'tt-hint' }, t('smartCheckoutHint')),
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
        zentao: { baseUrl: '', account: '', password: '', scope: 'product', containerId: '', containerName: '' },
        gitlab: { baseUrl: 'https://gitlab.com', token: '', projectPath: '', labels: '' },
        defaultWorkspacePath: '',
        baseBranch: '',
        useWorktree: true,
        excludeCompleted: true,
      })
      const [projectsText, setProjectsText] = React.useState('')
      const [projectCatalog, setProjectCatalog] = React.useState([])
      const [projectBusy, setProjectBusy] = React.useState(false)
      const [projectError, setProjectError] = React.useState('')
      const [zentaoCatalog, setZentaoCatalog] = React.useState([])
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
        const gitlab = settings.gitlab ?? {}
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
            account: zentao.account ?? '',
            password: '',
            scope: zentao.scope === 'project' ? 'project' : 'product',
            containerId: zentao.containerId ?? '',
            containerName: zentao.containerName ?? '',
          },
          gitlab: {
            baseUrl: gitlab.baseUrl || 'https://gitlab.com',
            token: '',
            projectPath: gitlab.projectPath ?? '',
            labels: gitlab.labels ?? '',
          },
          defaultWorkspacePath: settings.defaultWorkspacePath ?? '',
          baseBranch: settings.baseBranch ?? '',
          useWorktree: settings.useWorktree !== false,
          excludeCompleted: settings.excludeCompleted !== false,
        }))
        setProjectsText(Array.isArray(tapd.projects) ? tapd.projects.join(', ') : '')
        const names = tapd.projectNames ?? {}
        if (Object.keys(names).length > 0) {
          setProjectCatalog((current) => {
            const merged = new Map(current.map((project) => [project.id, project]))
            for (const [id, name] of Object.entries(names)) {
              if (!merged.has(id)) merged.set(id, { id, name, category: 'project' })
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
        setProjectError('')
        try {
          const result = await api('zentao/containers', {
            baseUrl: draft.zentao.baseUrl.trim(),
            account: draft.zentao.account.trim(),
            password: draft.zentao.password,
          })
          if (!alive.current) return
          const list = [
            ...(result.products ?? []).map((item) => ({ ...item, kind: 'product' })),
            ...(result.projects ?? []).map((item) => ({ ...item, kind: 'project' })),
          ]
          setZentaoCatalog(list)
          if (list.length === 0) setProjectError(t('zentaoNoContainers'))
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
              account: draft.zentao.account.trim(),
              scope: draft.zentao.scope === 'project' ? 'project' : 'product',
              containerId: draft.zentao.containerId.trim(),
              containerName: draft.zentao.containerName ?? '',
            },
            gitlab: {
              baseUrl: draft.gitlab.baseUrl.trim() || 'https://gitlab.com',
              projectPath: draft.gitlab.projectPath.trim(),
              labels: draft.gitlab.labels.trim(),
            },
            defaultWorkspacePath: draft.defaultWorkspacePath,
            baseBranch: draft.baseBranch.trim(),
            useWorktree: Boolean(draft.useWorktree),
            excludeCompleted: Boolean(draft.excludeCompleted),
          }
          if (draft.token.trim()) patch.token = draft.token.trim()
          if (draft.apiPassword) patch.apiPassword = draft.apiPassword
          if (draft.zentao.password) patch.zentaoPassword = draft.zentao.password
          if (draft.gitlab.token.trim()) patch.gitlabToken = draft.gitlab.token.trim()
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
            story: {
              id: dialog.id,
              uid: dialog.uid,
              source: dialog.source,
              kind: dialog.kind,
              remoteId: dialog.remoteId,
              shortId: dialog.shortId,
              rootId: dialog.rootId,
              rootShortId: dialog.rootShortId,
              rootName: dialog.rootName,
              name: dialog.name,
              description: dialog.description,
              status: dialog.status,
              vStatus: dialog.vStatus,
              completed: dialog.completed,
              owner: dialog.owner,
              creator: dialog.creator,
              priorityLabel: dialog.priorityLabel,
              app: dialog.app,
              labels: dialog.labels,
              due: dialog.due,
              begin: dialog.begin,
              iterationId: dialog.iterationId,
              iterationName: dialog.iterationName,
              url: dialog.url,
              projectId: dialog.projectId,
              projectName: dialog.projectName,
            },
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
          const record = await api('dispatch', {
            storyId: story.id,
            uid: story.uid,
            projectId: story.projectId,
            story: { ...story, dispatch: undefined },
            // 补发 is an explicit "send these assets" action, so it still sends.
            deliver: 'send',
          })
          if (!alive.current) return
          if (record.assetsAdded) {
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
      const projectLabel =
        provider === 'tapd'
          ? selectedProjectLabel(tasks, boot)
          : provider === 'zentao'
            ? boot?.settings?.zentao?.containerName || boot?.settings?.zentao?.containerId || ''
            : boot?.settings?.gitlab?.projectPath || ''

      const tab = (key, label) =>
        h(
          'button',
          { className: 'tt-tab' + (filter === key ? ' tt-tab-on' : ''), onClick: () => setFilter(key) },
          `${label} ${counts[key]}`,
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
              h('div', { className: 'tt-title' }, t('title')),
              h(
                'div',
                { className: 'tt-sub' },
                [t('subtitle'), providerLabel, projectLabel, boot?.version ? `v${boot.version}` : ''].filter(Boolean).join(' · '),
              ),
            ),
            h(
              'div',
              { className: 'tt-head-actions' },
              h('button', { className: 'tt-btn tt-btn-small', onClick: () => void loadTasks(), disabled: loading }, loading ? t('loading') : t('refresh')),
              h('button', { className: 'tt-btn tt-btn-small', onClick: openSettings }, t('settings')),
            ),
          ),
          h(
            'div',
            { className: 'tt-tabs' },
            ['tapd', 'zentao', 'gitlab'].map((key) =>
              h(
                'button',
                {
                  key,
                  className: 'tt-tab' + (provider === key ? ' tt-tab-on' : ''),
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
                { className: 'tt-tabs' },
                tab('open', t('filterOpen')),
                tab('all', t('filterAll')),
                tab('done', t('filterDone')),
                h('span', { className: 'tt-count' }, `${visible.length} / ${stories.length} ${t('storyCount')}`),
              )
            : null,
          tasks && tasks.ownerFilteredEmpty
            ? h('div', { className: 'tt-note' }, h('div', null, t('unfilteredHint')))
            : null,
          tasks && visible.length === 0
            ? h(
                'div',
                { className: 'tt-note' },
                h('div', { className: 'tt-note-title' }, t('empty')),
                h('div', null, t('emptyHint')),
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
      __test: { buildGroups, selectedProjectLabel, StoryRow },
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
              applied = conversation.input.requestDraftInitialization(binding, {
                prompt: String(draft?.text ?? ''),
                whenDraftExists: 'keep',
              })
            } catch (error) {
              return { ok: false, reason: 'draft', message: error?.message ?? String(error) }
            }
          }
          if (applied === 'blocked') return { ok: false, reason: 'blocked' }
          // Someone already typed into this composer: keep their text and do
          // not pile our attachments on top of it.
          if (applied === 'preserved') return { ok: true, applied, attachments: 0, missing, preserved: true }
          const assets = Array.isArray(draft?.assets) ? draft.assets : []
          if (assets.length === 0) return { ok: true, applied, attachments: 0, missing }
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
            const created = conversation.createDrafts?.(sessionId, files)
            ids = (Array.isArray(created) ? created : []).map((item) => item?.id).filter(Boolean)
            if (ids.length > 0) conversation.input.shellFor?.(binding)?.addAttachments?.(ids)
          } catch (error) {
            return {
              ok: true,
              applied,
              attachments: 0,
              missing: files.map((file) => file.name),
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
