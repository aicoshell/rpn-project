# TODO (shortcuts and improvements)

## Done
- Backend deployed to Vercel as serverless function (FastAPI under `/api`).
- Frontend API base centralized via `frontend/src/config.ts` and env `VITE_API_BASE`.
- Redis integration with fallback to memory; storage via `backend/app/storage.py`.
- Diagnostics endpoints: `/rpn/_storage`, `/rpn/_diag`, `/rpn/_write_test`, `/rpn/_read_test/{id}`.

## Next
- Finalize Vercel backend env: set `REDIS_URL` and redeploy; verify `/api/rpn/_storage` shows `redis`.
- Create Vercel project for frontend (Root: `frontend`, Build: `npm run build`, Output: `dist`).
- Set `VITE_API_BASE` on frontend Vercel to point to backend `/api` URL.

## Backlog
- Input validation and i18n for error messages (currently FR messages, minimal parsing).
- Session-scoped stacks (via header/cookie) instead of single global stack.
- CI workflow for tests and lint.
- Dockerfiles for backend and frontend.
- Better number formatting and scientific notation.
- Keyboard bindings for operators and Enter to push.
- E2E tests (Playwright) for frontend.
