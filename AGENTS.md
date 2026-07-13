# Kivitely Codex Working Notes

These repo-local notes capture recurring rules for Codex work in this project.

- Do not read, print, commit, or modify `.env.local`.
- Treat `.next/`, `node_modules/`, `dev-server*.log`, and `tsconfig.tsbuildinfo` as generated/local artifacts.
- After running `npm run build`, check `next-env.d.ts`. If the build changes the route import from `./.next/dev/types/routes.d.ts` to `./.next/types/routes.d.ts`, restore the dev import unless the task explicitly asks for production-type output.
- Keep `docs/progress-log.md`, `docs/product-domain-baseline.md`, and `docs/visibility-rls-plan.md` local planning files unless the user explicitly asks to commit them.
- Do not introduce new dependencies unless the user explicitly approves it.
- For Supabase work, do not use service role or secret keys. Prefer controlled anon/authenticated policies and mock fallback while Auth is not wired.
- Before committing, run the requested verification commands and check `git status --short` so only intended files are staged.
- Before pushing a committed change, provide a short manual test checklist tailored to the change. Wait for the user to confirm the test result before pushing, unless the user explicitly asks to push immediately.
- After a successful push, do not start new development automatically. Verify that `origin/main` is up to date, then suggest 2-4 prioritized next steps with short reasoning. Mark one recommended next step and provide a ready-to-copy Codex prompt for it. Wait for the user to choose before implementing.
