# Agent Instructions

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

## Planning Artefacts

Planning documents must live under `_bmad-output/planning-artifacts/`, not under `docs/`.

Do not create or move BMAD planning artefacts, ADRs for planning work, PRDs, architecture notes, epics, or similar planning material into `docs/`.

## BMAD Terminology

Outside BMAD-owned documents and directories (`_bmad/`, `_bmad-output/`, `.agents/`), do not use BMAD work-item references or other BMAD planning terminology when ordinary project language will do.

## Code Review Hard Rules

These rules override any default step instructions in the code review workflow.

### HARD RULE — Deferred Approval Gate

The review agent **must not** write any item to `_bmad-output/implementation-artifacts/deferred-work-audit.md` without first presenting each proposed deferral to the user individually and receiving explicit approval. For each finding classified as `defer`, halt and ask:

> **Proposed deferral:** [item title and detail]
> Approve adding to the deferred work register?
> 1. Yes — add to deferred-work-audit.md
> 2. No — reclassify as `patch`
> 3. No — dismiss (noise, not worth tracking)

Only proceed to write the entry if the user selects option 1. If denied, reclassify per the user's choice. Never batch-write defer findings to deferred-work-audit.md without per-item approval.

### HARD RULE — Addressed Deferred Item Cleanup

When a story is marked `done` during step 6 of the review workflow, the review agent must check whether the story file's Dev Notes contain any `Deferred from:` references. If so:

1. Open `_bmad-output/implementation-artifacts/deferred-work-audit.md`.
2. For each `Deferred from:` reference in the story's Dev Notes, locate and remove the corresponding section and bullet entries from deferred-work-audit.md.
3. Save the updated deferred-work-audit.md.

Stories created specifically to address deferred items (such as 6.x hardening stories) must result in the removal of the items they addressed from deferred-work-audit.md when they are marked done. The deferred-work-audit.md file must never retain entries that have been resolved by a completed story.
