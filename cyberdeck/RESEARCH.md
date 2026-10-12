# Cyberdeck research

Gathered 2026-10-12. Not re-checked after that.

Question: a Claude Code 2.1.x function-hook mod with a right pane (MCP on/off, agents, cloud vs local), restyled status/spinner/tools, readable on Termius iPhone portrait.

## Findings

- No shipped Claude Code cyberpunk theme was found. OpenCode documents synthwave84 and matrix (https://opencode.ai/docs/themes/, fetched 2026-10-11). Crush was called synthwave out of the box in one XDA article (2026-06-09). A Codex theme index names Alhamdulillah-R/cyberpunk-codex-skin; that repo was not opened.
- Status lines: ccstatusline (https://github.com/sirmalloc/ccstatusline, v2.2.32 2026-10-09), claude-powerline (https://github.com/Owloops/claude-powerline, v1.32 2026-09-23), claude-hud (https://github.com/jarrodwatts/claude-hud, transcript JSONL, not a pane), usage-bar mod (https://www.digital3d.com/Blog/88, 2026-10-11). Comparison: https://yigitkonur.com/research/claude-code-statuslines-compared (2026-04-16).
- Complaints: an over-wide line hides the prompt (https://github.com/luongnv89/cc-context-stats/issues/12, 2026-02-12). Glyphs >= U+F0000 corrupt redraws (https://github.com/anthropics/claude-code/issues/67456, 2026-06-11). claude-hud goes blank when a command takes > ~300ms (https://github.com/jarrodwatts/claude-hud/issues/555, 2026-05-17). Flicker: https://x.com/trq212/status/2001439019713073626 (2025-12-17).
- Pane API on Claude Code 2.1.290+: `$.ui.open` + `ui.render` for component `Pane`. An unasked open is placed from 144 columns (110 after the person has opened that id). A narrow terminal puts the pane above the prompt. Docs: https://code.claude.com/docs/en/plugins/mods/interface (2026-10-09) and the reference (2026-10-11). `$.agent.list()` has subagent status. `$.mcp` is call/connect only. No documented MCP health list or cloud-vs-local flag. `hooks/lib/model.ts` infers cloud vs local from config env only (`ANTHROPIC_BASE_URL`, Bedrock, Vertex, Foundry) and never probes.
- Palettes: Cyberpunk-Neon `#0abdc6` / `#ea00d9` / `#000b1e` (wiki 2024-01-28); ShellShade `#0A0A0F` `#00F0FF` `#00FF9C` `#FF003C` `#FCEE0A`. Pure `#00ff00`/`#ff0000` fails red-green color vision deficiency. Dalton `#5b914e` vs `#d85050`. Okabe-Ito `#009E73` vs `#D55E00` plus a glyph.
- Termius iOS has Nerd Font v3 since 2026-06-23 (bundled families only). Portrait is about 45-55 columns. Truecolor is disputed. https://termai.sh/blog/mobile-terminal-fonts-glyphs

## Caveat

SearXNG returned no hits. X had no cyberpunk Claude Code thread. Termius 24-bit color and the Codex skin are single or contradictory sources.
