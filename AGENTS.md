# Agent Instructions (Codex / OpenAI Agents)

## Language

All code, comments, documentation, commit messages, pull request descriptions, and any other written output must use **British English** spelling and conventions — unless directly referencing or quoting identifiers, APIs, or other artefacts written in American English (e.g. a function named `color` in a third-party library should not be renamed).

Examples of British English preferences:
- "colour" not "color"
- "organise" not "organize"
- "behaviour" not "behavior"
- "initialise" not "initialize"
- "licence" (noun) / "license" (verb)
- "artefact" not "artifact"
- "-ise"/"-isation" suffixes, not "-ize"/"-ization"

## Environment Initialisation

Before running any Node.js, package-manager, build, lint, test, generation, benchmark, or release command, initialise the agent shell from the repository root:

```bash
source .agents/initialise-env.sh
```

For command runners that create a fresh non-persistent shell for each command, prefix toolchain commands with the same bootstrap:

```bash
source .agents/initialise-env.sh && pnpm run test
```

The bootstrap must activate Node `24.14.1` from `.nvmrc` and `.node-version`, align with `pnpm@10.33.0` from `package.json`, and place the repository `node_modules/.bin` directory on `PATH`. Treat a bootstrap failure as a blocker rather than continuing with an ambient Node 20 or another unpinned toolchain.

Common resolver pins are intentionally duplicated:
- `.nvmrc` for nvm-compatible tools.
- `.node-version` for fnm, asdf, and related tools.
- `.tool-versions` for asdf and mise.
- `package.json` `volta` metadata for Volta shims.

## Planning Artefacts

Planning documents must live under `_bmad-output/planning-artifacts/`, not under `docs/`.

Do not create or move BMAD planning artefacts, ADRs for planning work, PRDs, architecture notes, epics, or similar planning material into `docs/`.

## BMAD Terminology

Outside BMAD-owned documents and directories (`_bmad/`, `_bmad-output/`, `.agents/`), do not use BMAD work-item references or other BMAD planning terminology when ordinary project language will do.
