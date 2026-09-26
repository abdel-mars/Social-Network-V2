# Instructions for Social-Network-V2

- This repo is a monorepo with a Go backend in `backend/` and a Next.js frontend in `frontend/`.
- The backend is a plain `net/http` app, not a framework. Routes are registered in `backend/internal/servergo/runserver.go` using `http.NewServeMux()`.
- The backend uses SQLite and applies its schema with **golang-migrate** at startup.
  Migrations live in `backend/pkg/db/migrations/sqlite/` as numbered `.up.sql`/`.down.sql`
  pairs and are run by `backend/internal/Initialdb/db.go`. The loose `.sql` files in
  `backend/database/` are *not* loaded at startup.
- Session auth is cookie-based: `/api/login` sets an HttpOnly `session` cookie (scoped
  to `Path: "/"`), and `backend/internal/Middleware/middleware.go` validates that cookie
  against the `sessions` table.
- CORS is explicitly configured only for `http://localhost:3000` with credentials allowed. All frontend requests that require auth must use `credentials: "include"`. This only matters in the two-process local dev setup; in Docker, Caddy serves everything from one origin and no cross-origin request happens.
- The whole API is mounted under a single `/api` prefix via `http.StripPrefix`, so
  handlers are registered without it (`/login`, not `/api/login`). Static uploads are
  registered separately at `/uploads/`.

## Important runtime details
- Local backend startup: `cd backend && go run main.go`.
- Local frontend startup: `cd frontend && npm install && npm run dev`.
- `./run.sh` starts both together and is the recommended entry point.
- Backend listens on `:8080`; frontend runs on `:3000`. The backend honours the `PORT` env var, defaulting to `8080`.
- Frontend source does **not** hardcode backend URLs. Every API, WebSocket and upload
  URL comes from `frontend/src/app/lib/api.js`, which resolves
  `NEXT_PUBLIC_API_URL` first, then `window.origin`, then falls back to
  `http://localhost:8080`. Changing the backend origin means changing that env var, not
  editing 29 files.
- Because the frontend falls back to `window.origin`, a single-origin deployment
  (Caddy in front of both) needs no env var at all.

## Key integration points
- `/api/events` is SSE and served by `backend/internal/sse/sse.go`.
- `/api/ws/chat` is the websocket endpoint for chat, served by `backend/internal/chat.Handler`.
- Static uploads are served from `/uploads/` and stored in `backend/uploads`.
- `/api/register` accepts `multipart/form-data` and saves an avatar file under `backend/uploads`.
- `backend/internal/repository/global.go` holds shared DB state, JSON models, and the request context key for `userID`.
- `repository.Posts` (`global.go`) is the JSON shape returned by the feed endpoints.
  Its fields are `snake_case` except `userReaction`.
- `handler.CreatePost` expects `multipart/form-data` with `title`, `content` and an
  optional `privacy` (`public` by default) — not JSON.

## Backend structure and conventions
- `backend/internal/handler/` contains API handlers that map 1:1 to routes.
- `backend/internal/set_get_data_base/` contains SQL helper functions for users and posts.
- `backend/internal/repository/User_Query_db.go` contains SQL query constants, while actual query execution lives in `set_get_data_base`.
- Route naming is not normalized; e.g. `/Createpost`, `/Create_Group`, `/Get_Groups`, and `/toggle-follow` are all used. Do not "fix" the casing while working nearby, and do not add new routes to a normalized scheme — match what is already there.
- The backend is stateful and expects the session cookie on authenticated routes rather than token headers. Every route in `Mux()` is wrapped in `midle.AuthMiddleware` except exactly four: `/login`, `/logout`, `/register` and `/checkstate`.

## Things to avoid or verify
- The Docker setup is current and verified. `docker/docker-compose.yml` builds and runs
  both services, and `docker/Dockerfile.backend` builds `main.go` correctly (there is no
  `cmd/server.go`; the binary is the backend root package).
- Locally, run the stack with `docker compose -p social -f docker/docker-compose.yml -f docker/docker-compose.local.yml up -d --build`.
  The project name `-p social` matters: Compose would otherwise name the project after
  the `docker/` directory and collide with other stacks on the machine.
- Avoid changing CORS without updating frontend origin assumptions.

## What matters for code changes
- New endpoints should be registered in `backend/internal/servergo/runserver.go`, without the `/api` prefix.
- Schema changes belong in `backend/pkg/db/migrations/sqlite/` as a new numbered
  `.up.sql`/`.down.sql` pair. Adding a loose `.sql` to `backend/database/` does nothing.
- Authentication context is passed via `context.WithValue` with `repository.UserIDKey`.
- File uploads should use `multipart/form-data` and save under `./uploads`.
- `backend/database/forum.db` and `backend/uploads/` are deliberately tracked in Git;
  there is no root `.gitignore`. Do not add one, and do not assume the database is a
  build artifact.

If any route behavior or startup command is unclear, I can refine this guidance with specific examples from the frontend or backend handlers.