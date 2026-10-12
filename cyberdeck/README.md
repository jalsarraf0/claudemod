# Cyberdeck 0.2

A Claude Code operations HUD with real Codex and Grok task delegation. The pane shows the model/provider, live context usage, agent work, configured MCP enablement, Git branch/dirty state/upstream divergence, and linked worktrees. A status row above the prompt fits desktop and Termius phone widths.

Requires **Claude Code 2.1.290 or later**; validated and tested on **2.1.296**. Older engines receive a readable requirement instead of starting the HUD. Pane placement is controlled by Claude Code and available terminal space.

## Install

In Claude Code:

```text
/plugin marketplace add jalsarraf0/claudemod
/plugin install cyberdeck@claudemod
```

Or load a checkout:

```bash
claude --plugin-dir ./cyberdeck
```

Restart the session after installing/updating. Cyberdeck works alone; the optional context bars provide alternate context displays.

## Commands

| Command | Behavior |
| --- | --- |
| `/cyberdeck` | Toggle the detail pane; retain the status row |
| `/cyberdeck refresh` | Reload model/provider, MCP configuration, Git, usage, and provider availability |
| `/cyberdeck auto` | Full at 120+ columns, compact at 70–119, mobile below 70 |
| `/cyberdeck full` / `compact` / `mobile` | Select status detail; every mode still clips to available cells |
| `/cyberdeck route auto <task>` | Select a configured provider and return its answer |
| `/cyberdeck route codex <task>` | Explicit Codex handoff |
| `/cyberdeck route grok <task>` | Explicit Grok handoff |

The pane uses its own body width, including when Claude Code places it above the prompt. Terminal escape/control sequences are removed from display labels; wide glyphs are counted conservatively. Symbols and words carry state independently of color. The status row yields to Claude Code surveys.

## Smart routing

Install and authenticate the **Codex CLI** on the same host, and/or set `XAI_API_KEY` in the environment Claude Code inherits. No API key is saved in the repository, HUD state, or diagnostic messages. The pane distinguishes **Codex installed** and **Grok key set**, not authentication/health guarantees.

```text
/cyberdeck route auto review the authentication code
/cyberdeck route grok research the latest Fedora release notes
```

Claude can also call **`mcp__cyberdeck__route`**, with:

| Input | Meaning |
| --- | --- |
| `task` | Required independent task; at most 24,000 characters |
| `provider` | `auto` (default), `codex`, or `grok` |
| `kind` | Optional `code`, `research`, or `general`; overrides classification |
| `context` | Explicit supplemental context; at most 48,000 characters |

The router tool checks the engine's tool permission decision before dispatch. Allow that exact tool in your normal Claude Code permission settings to let Claude invoke it; an unresolved/denied decision refuses dispatch. The slash command is an explicit user handoff. The included `/delegate` skill explains how Claude should use the tool for independent work.

Auto uses a deterministic task classifier: coding/debugging/tests favor Codex, research/comparisons/documentation favor Grok, and general tasks favor Codex. Explicit provider and kind override it. If the preferred provider is unconfigured, auto selects the other configured provider **before** dispatch. No automatic second request is sent after an error or timeout. This is a transparent routing policy, not a learned quality or cost optimizer. Claude's ordinary native subagents remain native; the router creates additional provider-owned tasks rather than replacing `agent.spawn`.

**Codex** runs `codex exec --json --sandbox read-only -`, with task/context on stdin, no shell interpolation, and a 120-second process limit. It inherits the installed CLI's authentication, model, user rules, and integrations. `CYBERDECK_CODEX_MODEL` optionally selects its model. Codex can read the current repository and returns review, analysis, or proposed changes for Claude to evaluate; it does not edit the worktree through this adapter.

**Grok** uses the fixed xAI Responses endpoint with `store:false` and `grok-4.7` by default (`CYBERDECK_GROK_MODEL` overrides it). It receives only the supplied task and explicit context, not your transcript or automatically read files. Research tasks enable xAI's server-side web search; other tasks do not. Responses/API search incur your provider's normal charges. The adapter returns completed assistant text and omits reasoning/tool internals.

At most two routed tasks run simultaneously; the HUD retains recent outcomes. Session changes clear routed rows and discard late results from the old session; in-flight requests still count until they settle. Answers are capped at 24,000 characters with a visible truncation marker. The Grok deadline returns after 120 seconds; the mods HTTP API has no cancellation option, so the remote request may continue. Returned provider text is task output for the coordinating Claude to assess, never code or commands automatically executed by Cyberdeck.

## What the HUD means

- **LOCAL/CLOUD:** inferred from configured endpoint/provider flags, never a network probe. A local address can front a cloud service. Loopback, private IPv4, CGNAT, IPv6 ULA/link-local and LAN hostnames count as local endpoints. Host/port are displayed without URL credentials, paths or query parameters. Bedrock/Vertex/Foundry flags take precedence.
- **Provider:** local endpoints say `local endpoint`. Set `CYBERDECK_PROVIDER='LM Studio'` (or your actual runtime) for a specific label. Bedrock also displays `AWS_REGION` / `AWS_DEFAULT_REGION` when present.
- **Context:** the last API response's live context figures, matching the engine status data. Before a response, after compaction, or on an unavailable reading, it shows `?` / `unavailable`. It does not run token-count requests.
- **MCP enabled/disabled:** names from `~/.claude.json` user and closest-project server maps, marked by that project's `disabledMcpServers`. It is partial configured enablement, not connection health. `.mcp.json`, plugin-managed servers and runtime connectivity are not inventoried. Unreadable/malformed config is `unavailable`.
- **Agents:** Claude Code's roster plus routed Codex/Grok tasks. Active tasks come first, then failures and finished work. Completed work uses `✓`; failure uses `✕`.
- **Git:** local porcelain status and absolute Git paths only. No fetch or remote API calls. Missing upstream counts stay `no upstream`; detached and unborn branches are supported. Outside Git, denied processes or timeouts show `unavailable`.

Agents refresh every two seconds without reading model/MCP configuration or running Git. Session start, prompt submission, settings changes, commands and manual refresh reload configuration. Tool/turn/measurement events update usage and Git, with ordinary Git refreshes throttled to once per two seconds. Refreshes are serialized and polling cannot accumulate overlapping jobs.

## Development and verification

From the repository root:

```bash
npm ci
npm run validate
npm run typecheck
npm test
```

CI runs the same checks for all three plugins without provider credentials or billable model requests. Hook tests exercise the actual Claude mod runtime with mocked host/provider operations. Pure logic tests cover routing, request builders/parsers, malformed config, rendering widths, provider detection, Git, and response truncation.

The public Anthropic type reference currently predates the state-helper API, so CI type-checks **pure modules and their tests** against a pinned public declaration snapshot. `claude plugin validate` plus native `claude plugin test` cover registration/hooks on the pinned 2.1.296 runtime. For complete hook TypeScript checking, first open the mod in an interactive `--plugin-dir` session, which writes declarations for that engine, then run `npx tsc -p cyberdeck`. Live credentialed provider calls and Termius device rendering need a separate host smoke test.

API references: [Claude mods](https://code.claude.com/docs/en/plugins/mods/reference), [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [xAI Responses](https://docs.x.ai/developers/model-capabilities/text/generate-text), [xAI web search](https://docs.x.ai/developers/tools/web-search).
