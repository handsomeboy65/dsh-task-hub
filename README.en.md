# dsh-task-hub

[简体中文](README.md) · **English**

A task hub for DSH: reads the requirements, tasks and issues assigned to you from **TAPD / ZenTao / GitLab**, then lets you pick a workspace, type a branch name, and dispatch an agent in one click.

The three sources are **mutually exclusive**: the tabs at the top switch the active source, and only one source is listed — and only one takes effect — at a time. Switching never merges them. Each source keeps its own URL, credentials and project settings in `settings.json`, so switching back and forth loses nothing.

## Install

```sh
dsh plugin --profile web add dsh-task-hub
```

Before the package is on npm, install it from GitHub instead:

```sh
dsh plugin --profile web add github:handsomeboy65/dsh-task-hub
```

Restart `dsh web` afterwards — "Task Hub" appears in the sidebar. On desktop, install it from **Settings → Plugins** inside the app.

## The branch name is typed by hand

The dispatch dialog asks for a **complete branch name** (for example `feature/order-export`). The plugin does not derive `issue_<id>` from the work item and does not append any suffix. The name is validated with `git check-ref-format --branch`; an invalid name fails immediately.

## First-time configuration

Click **Settings** in the top-right corner of the panel, pick a source at the top, then fill in that source's fields.

### TAPD

| Field | Meaning |
| --- | --- |
| Authentication | Token, or API account + password |
| API account / password | TAPD open platform → personal settings → API account. This is not your login password. |
| Assignee | Filters stories by assignee; leave blank to use the TAPD account itself |
| Project ID | The TAPD project's `workspace_id`, comma-separated; "Fetch projects" lets you pick |
| Nick | Used when fetching the project list; may be left blank |

### ZenTao

| Field | Meaning |
| --- | --- |
| ZenTao URL | For example `https://zentao.example.com`; `/api.php/v1` is appended automatically |
| Account / password | Your ZenTao login; the password is written only to DSH credentials |
| Scope | `Product` reads product stories, `Project` reads tasks under the project's executions |
| Product / Project | An ID, or pick one after "Fetch list" |

ZenTao exposes no "assigned to me" endpoint, so the plugin logs in for a token first and then filters by the current account locally.

### GitLab

| Field | Meaning |
| --- | --- |
| GitLab URL | `https://gitlab.com`, JiHu GitLab, or the root URL of a self-hosted instance |
| Access token | Personal access token with at least `api` / `read_api` |
| Project path | Optional, `group/project`; leave blank to read every issue assigned to you on the instance |
| Labels | Optional, comma-separated, passed to GitLab as the `labels` filter |

Credentials are written to DSH `credentials` (they can also come from the environment variables `TAPD_API_USER` / `TAPD_API_TOKEN` / `TAPD_API_PASSWORD` / `ZENTAO_PASSWORD` / `GITLAB_TOKEN`). No secret is ever written into the plugin's data files.

### General

| Field | Meaning |
| --- | --- |
| Default workspace | The DSH workspace preselected when dispatching (e.g. TMS2.0) |
| Base branch | Leave blank to detect `origin/HEAD` |
| Isolated worktree | On by default: creates `.dsh-worktrees/<repo>-<branch>` next to the repository so your current branch is left alone |
| Hide completed | The list shows only open items by default |

## Dispatch flow

1. The panel lists items whose assignee is you, newest first, filterable by Open / Done / All. For TAPD stories the **App** custom field (e.g. `德速TMS2.0客户端`) gets its own column ahead of the ID; multiple apps stack as separate tags, and the column is dropped entirely when the source has no app field.
2. Click **Dispatch agent** on an item.
3. In the dialog, confirm the target workspace (or type a repository path), the **branch name**, whether to use a worktree, the base branch, and optional extra instructions.

   Extra instructions are appended after the generated brief (title, description, attachments, screenshots, working agreement) under `## Extra instructions`; they never replace the story text.
4. On confirm the plugin runs, in order:
   - `git worktree add -b <branch>` (or `checkout -b` in place);
   - creates (or reuses) a DSH workspace on the worktree/repository and starts a session;
   - writes the item's title, description, status, priority, app, due date, source link, plus working agreements such as "do not push, run the tests, summarise in Chinese", into the new session's **composer draft**;
   - TAPD items bring their attachments (including parent/root stories) and description screenshots; GitLab downloads `/uploads/...` images and files referenced in the description; ZenTao currently sends text only. Those attachments are staged as draft attachments on the composer as well;
   - renames the session to `<branch> · <title>` and jumps to it.
   **Nothing is sent automatically**: once the session opens, the brief and its attachments sit in the composer, and you send when you are ready.
5. The panel shows the branch and session state (running / idle / draft / session gone), refreshing the running state every 8 seconds.

Dispatching the same item again returns the existing session instead of creating another branch — provided that session still exists. If that dispatch still has a draft, **Open** puts it back into the composer (an existing draft is never overwritten). Only an explicit **Resend attachments** click actually sends attachments to the session.

## Data and failure modes

- Settings: `~/.dsh/task-hub/settings.json`; dispatch records: `~/.dsh/task-hub/state.json`.
- Records are keyed by `source:id` (e.g. `zentao:task-31`), so items from different systems that share an ID never overwrite each other. Older TAPD records keep working under their original IDs.
- In-place dispatch requires a clean workspace; otherwise it reports "workspace has uncommitted changes".
- An existing worktree of the same name sitting on another branch is reported as a conflict — it is never force-changed.
- A failing project/product query does not break the rest of the list; the error is surfaced in the panel.

## Development

```bash
npm test     # 62 cases: pure functions, git flow, dispatch, client rendering, all three adapters
```

After changing the code, an installed bundle needs a DSH restart to load the new JS generation (the first load at install time can go through HMR).

## Limitations

- TAPD covers requirements (stories) only — no tasks, no bugs. ZenTao reads product stories or per-execution tasks, no bugs. GitLab reads issues only, no merge requests.
- Nothing is written back to the source system (no status changes, no comments).
- The plugin does not plan for the agent; after dispatch, the agent in the session plans and implements on its own.
