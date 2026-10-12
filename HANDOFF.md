# Cyberdeck 0.2 handoff

Checkpoint requested by Jamal on 2026-10-11 (America/Chicago). This note and all current implementation changes are committed together. This is an implementation checkpoint, not a merge approval or a claim that live-provider smoke tests have finished.

## Integration update — direct main publication

The user subsequently instructed: **"Push to main now"**. This supersedes the earlier PR workflow. A fresh independent whole-branch review identified and reproduced permission-payload, concurrency and stale-session bugs; those were fixed before publication.

- The router now passes `{ tool, input }` to the engine's permission check. Native tests cover allowed calls and refusal of `ask`/`deny` without dispatch.
- Capacity is checked/reserved after the asynchronous availability read without an intervening yield. A three-call concurrent native test proves only two dispatch.
- Routed rows clear on session start/end. A lifecycle generation blocks stale dispatch and discards late results after clear/resume; outstanding requests retain accurate accounting until they settle.
- Fresh validation, pure-module TypeScript checking and the full suite passed: **95 tests, zero failures** (Cyberdeck 59, Context Bar 5, Nobara Bar 31). `git diff --check` passed.
- Live credentialed provider calls and full hook TypeScript checking against generated exact-build declarations remain unverified. No newly exposed remote terminal was available in this thread.
- Native Git push cannot authenticate in this checkout; publication uses the user's connected GitHub account, with a fast-forward update and expected-main-SHA check. The uploaded tree must exactly equal the tested local Git tree before the update.

The sections below describe the earlier `bdad3d1` checkpoint; their outstanding PR/review items are historical except for the live-provider/typecheck limitations just noted.

## Request and continuity

Continue Astra's exploration/proposal for `jalsarraf0/claudemod` and make a PR implementing Cyberdeck improvements. The user then explicitly expanded scope to include a smart router handing work to Codex and Grok. The latest instruction is to write this handoff and commit the current changes now.

Repository: `jalsarraf0/claudemod`

Branch: `feat/cyberdeck-0.2`

Base: `main` at `01b60ab5f8c99bda1b8d54aa9a00962237db3d91`

Working checkout: `/workspace/scratch/8fd93b91a2b4/claudemod`

At this checkpoint, the feature branch has **not been pushed and no PR has been opened**. Preserve this checkout and branch. Original PR creation remains outstanding after review.

## Implemented

- Cyberdeck version bumped to 0.2.0, with an accurate plugin description.
- Live context percentage/tokens/window, model/provider/host/port, Bedrock region, native agents, configured MCP enablement, Git dirty/clean and upstream divergence, detached/unborn branches, and linked worktree display.
- MCP `enabled`/`disabled` terminology, closest-project server inclusion, safe handling of malformed/non-object config, and explicit unavailable readings. No claims of connection health.
- Status modes: full at 120+ cells, compact at 70–119, mobile below 70, plus explicit commands. Every mode remains width bounded. Terminal controls/escapes are stripped from external display labels; wide glyphs receive conservative cell widths.
- Responsive status rendered in the supported `AbovePrompt` band, rather than mutating state from a render hook. PromptHint preserves the existing hint and appends a width-bounded model tag. Pane rendering is also pure.
- Agents refresh every two seconds. Model/MCP/configuration reloads happen on session/prompt/settings/command events or explicit refresh. Git is event refreshed and throttled; refreshes serialize and timer work does not accumulate overlapping polls.
- Version requirement check for Claude Code >= 2.1.290; current tests use 2.1.296.
- Real Codex CLI and Grok Responses adapters, smart routing policy, explicit slash handoffs, native router tool, provider-owned HUD tasks, and `/delegate` skill.
- End-user Cyberdeck README, updated suite README, all three plugins exposed in the marketplace, pinned npm tooling/lockfile, CI, and pure-module TypeScript checks.
- Two minimal strict-type fixes in `context-bar` (safe indexed cell increment and theme fallback).

## Router behavior and boundaries

Commands:

```text
/cyberdeck route auto <task>
/cyberdeck route codex <task>
/cyberdeck route grok <task>
```

Tool: `mcp__cyberdeck__route`, with `task`, optional `provider`, `kind`, and explicit `context`.

Automatic selection is deterministic: coding/debugging/tests favor Codex; research/comparison/documentation favor Grok; general work favors Codex. Explicit provider/kind override the heuristic. If the preferred provider is unconfigured, the other configured provider is chosen before dispatch. A failure does not automatically create a second request.

- Codex: `codex exec --json --sandbox read-only [--model MODEL] -`; stdin carries task/context, current repository is available to the CLI, process deadline is 120 seconds. Authentication, rules and integrations come from the installed CLI. It returns analysis/proposed changes; it does not edit through this adapter.
- Grok: fixed `https://api.x.ai/v1/responses`, `store:false`, default `grok-4.7`, explicit task/context only, web search enabled for research tasks. It does not automatically receive files or the session transcript.
- Environment: `XAI_API_KEY`; optional `CYBERDECK_CODEX_MODEL`, `CYBERDECK_GROK_MODEL`, `CYBERDECK_PROVIDER`.
- Tool dispatch requires an allowed engine tool-permission decision. The slash command is a direct user handoff. No bypass flags are used.
- At most two external tasks run together; recent results appear under provider ownership in the HUD. Results are capped at 24,000 characters. Only completed assistant output is returned, excluding private reasoning and raw diagnostics.
- Grok's 120-second deadline does not cancel the HTTP request remotely: the mods HTTP API exposes no cancellation option. The request may continue at the provider. No automatic retry is sent.
- This adds external delegation, not transparent replacement of Claude's `agent.spawn`. Native Claude agents remain native.

## Verified at this checkpoint

The following commands passed on the current tree immediately before this note/commit:

```bash
npm run validate
npm run typecheck
npm test
git diff --check
```

Full test results: **90 passed, 0 failed**:

| Plugin | Tests |
| --- | ---: |
| Cyberdeck | 54 |
| Context Bar | 5 |
| Nobara Bar | 31 |

Tests cover pure routing/provider request and response behavior, actual mod-runtime slash handoffs against mocked host/providers, error redaction, rendering, config parsing, Git, and existing supporting plugins. The adapter implementers observed failing tests before implementing their logic, followed by passing runs.

TypeScript scope is deliberately explicit: CI checks pure modules and their tests against a pinned public Anthropic declaration snapshot. That public snapshot predates `atom`/`read`/`update` and current pane placement types, so registration/hooks are checked with native `claude plugin validate` and native `claude plugin test`, not falsely described as fully TypeScript checked. An interactive `claude --plugin-dir ./cyberdeck` session generates exact current declarations; then `npx tsc -p cyberdeck` can check the full hooks.

Validation emits nonfatal installation-doc suggestions for supporting plugins. npm emits an environment-level `http-proxy` warning. Neither caused failed checks.

## Live session state

The user offered a live system and said an open session should be visible. Available computer inventory exposed only **Chrome with one `about:blank` tab**, no terminal/remote host. No live host has been reached. No live Codex task or paid xAI request was issued; provider handoffs so far are native-runtime tests with mocked provider responses.

A local interactive Claude launch reached its onboarding screen, not a credentialed project session, and was interrupted. Do not treat it as live validation. Obtain the exposed remote session or host connection from the user; keep API keys on that host, not in chat.

## Remaining work before the PR is ready

1. Review the whole diff independently. The pure provider adapters were reviewed by their implementers and the primary agent; a fresh whole-branch review has **not yet occurred**.
2. Add/verify native router **tool-call** integration and denied/ask permission behavior, not only slash commands. Check its flat argument envelope and normal Claude permission behavior against the live engine.
3. Verify timeout, concurrent handoff limits, and session-clear/end behavior for in-flight external tasks. The current checkpoint has deadline/concurrency handling but those lifecycle paths need focused integration review/tests.
4. On the user's live host, load this branch with `--plugin-dir`, generate actual engine types, run full hook TypeScript checking, and smoke-test one harmless read-only Codex task and one small Grok task using existing host credentials. Verify backend output, HUD ownership, errors, and Termius sizing. Provider calls incur normal usage charges.
5. Run the full checks again after review fixes. Commit those separately; keep this checkpoint intact.
6. Push `feat/cyberdeck-0.2` and open a PR against `main`. Do not merge without a separate instruction. Include exact test scope and live-test results/limitations in the PR body.

Suggested PR title: `feat(cyberdeck): add operations HUD and Codex/Grok smart routing`

Read `cyberdeck/README.md` for installation, commands, permission setup, interpretation of status, and known limits. Generated `.claude-plugin/types` and `node_modules` are ignored local tooling, not deliverables.
