# Instructions for Social-Network-V2

- This repo is a monorepo with a Go backend in `backend/` and a Next.js frontend in `frontend/`.
- The backend is a plain `net/http` app, not a framework. Routes are registered in `backend/internal/servergo/runserver.go` using `http.NewServeMux()`.
- The backend uses SQLite and initializes its DB at startup from all `.sql` files in `backend/database/` via `backend/internal/Initialdb/db.go`.
- Session auth is cookie-based: `/login` sets an HttpOnly `session` cookie, and `backend/internal/Middleware/middleware.go` validates that cookie against the `sessions` table.
- CORS is explicitly configured only for `http://localhost:3000` with credentials allowed. All frontend requests that require auth must use `credentials: "include"`.

## Important runtime details
- Local backend startup: `cd backend && go run main.go`.
- Local frontend startup: `cd frontend && npm install && npm run dev`.
- Backend listens on `:8080`; frontend runs on `:3000`.
- Frontend source uses hardcoded backend URLs like `http://localhost:8080/...`, so do not assume a proxy layer is present.

## Key integration points
- `/events` is SSE and served by `backend/internal/sse/sse.go`.
- `/ws/chat` is the websocket endpoint for chat, served by `backend/internal/chat.Handler`.
- Static uploads are served from `/uploads/` and stored in `backend/uploads`.
- `/register` accepts `multipart/form-data` and saves an avatar file under `backend/uploads`.
- `backend/internal/repository/global.go` holds shared DB state, JSON models, and the request context key for `userID`.

## Backend structure and conventions
- `backend/internal/handler/` contains API handlers that map 1:1 to routes.
- `backend/internal/set_get_data_base/` contains SQL helper functions for users and posts.
- `backend/internal/repository/User_Query_db.go` contains SQL query constants, while actual query execution lives in `set_get_data_base`.
- Route naming is not normalized; e.g. `/Createpost`, `/Create_Group`, `/Get_Groups`, `/Get_Group_By_ID/`, and `/toggle-follow` are all used.
- The backend is stateful and expects the session cookie on authenticated routes rather than token headers.

## Things to avoid or verify
- Do not assume the Docker setup is current. `docker/docker-compose.yml` exists, but `docker/Dockerfile.backend` points to a missing `cmd/server.go` file.
- Prefer local dev commands for correctness unless the Docker backend entrypoint is fixed.
- Avoid changing CORS without updating frontend origin assumptions.

## What matters for code changes
- New endpoints should be registered in `backend/internal/servergo/runserver.go`.
- Schema changes belong in `backend/database/*.sql`; the app loads all `.sql` files at startup.
- Authentication context is passed via `context.WithValue` with `repository.UserIDKey`.
- File uploads should use `multipart/form-data` and save under `./uploads`.

If any route behavior or startup command is unclear, I can refine this guidance with specific examples from the frontend or backend handlers.