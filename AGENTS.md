# AGENTS.md

<!-- Initial repository policy for the standalone Ankhorage Chess Test application. -->

## Repository

Project: `artiphishle/chess-test` — anonymous configurable chess experiments.

## Required skills (always load before implementation)

1. `.agents/skills/ankhorage-coding-rules/SKILL.md`
2. `.agents/skills/ankhorage-project-structure/SKILL.md`
3. `.agents/skills/hexagonal-architecture/SKILL.md`

Skills are sourced from [`ankhorage/devtools`](https://github.com/ankhorage/devtools). Follow their repository-current versions and inspect `.agents/skills/` before any change.

## Architecture

- Preserve inward dependencies: presentation and transport -> application -> domain.
- Own chess rules under `src/features/chess/domain/`. Do not use `chess.js` or another rules engine, even indirectly through ZORA's Chess component. Use ZORA web presentation primitives only.
- Keep the Next App Router adapter thin. Use the public `@ankhorage/api-nextjs` and `@ankhorage/api` entrypoints; never deep-import sibling source repositories.
- Keep matching, authorization and configuration locking on the server. Each queued game holds its own validated immutable template snapshot. Choice Coin resolution precedes normal play.
- Treat server-authoritative player identity as an opaque HttpOnly cookie. No login required.
- The in-process store is for a single persistent Node process; multi-instance/serverless deployment requires an explicit shared durable game repository before scaling.
- A configurable board may have zero kings on either side. The absence of a king disables checkmate on that side; resignation and draw remain possible.
- Standalone repository only: no workspace, file, link or sibling source imports.

## Tests and delivery

- Add deterministic unit tests for rule behavior, game states, setup, matchmaking and authorization. Do not add E2E tests at this stage.
- Use Conventional Commit titles, focused PRs and associated issues assigned to `artiphishle`; close completed issues.
- Run `bun run test`, `bun run check-types`, `bun run lint`, `bun run knip:check`, `bun run build`, and `bun run format:check` before merging.
- Use `@ankhorage/devtools` without suppressing canonical lint rules.
