<!-- Backend Documentation for Social-Network-V2 -->
# Backend

**Overview:**
- **Language:** Go
- **Server:** net/http-based HTTP server with a small routing layer in `internal/servergo`.
- **Database:** SQLite (file: `database/forum.db`, created from SQL files in `database/`).
- **Realtime:** WebSocket tunnel for real-time notifications (in `internal/notificationGoroutine` and `internal/repository`).

- Service listens on port `:8080` by default. The first run will create `database/forum.db` and apply schema from `database/schema.sql`.

**How it starts (entrypoint)**
- The binary entrypoint is `backend/main.go` which starts the notification goroutine and then runs the server: [backend/main.go](backend/main.go#L1-L40).
- Server initialization (dependencies, routing, CORS): [backend/internal/servergo/runserver.go](backend/internal/servergo/runserver.go#L1-L200).

**Project layout (important folders)**
- `internal/` — main application packages (auth, handler, repository, middleware, db init, server glue).
- `internal/auth/` — authentication handlers (`login`, `register`, `logout`, `checkstate`).
- `internal/handler/` — HTTP API handlers for posts, groups, notifications, profile, friends, reactions, etc.
- `internal/repository/` — DB helpers, shared globals and types (DB variable, regex, websocket clients): [backend/internal/repository/global.go](backend/internal/repository/global.go#L1-L240).
- `internal/Initialdb/` — DB initialization and schema application: [backend/internal/Initialdb/db.go](backend/internal/Initialdb/db.go#L1-L200).
- `internal/notificationGoroutine/` — background notification sender: [backend/internal/notificationGoroutine/go_Notification.go](backend/internal/notificationGoroutine/go_Notification.go#L1-L200).
- `internal/Middleware/` — CORS and auth middleware: [backend/internal/Middleware/middleware.go](backend/internal/Middleware/middleware.go#L1-L200).
- `internal/set_get_data_base/` — functions that perform queries and mutations against the DB for users and posts.
- `uploads/` — stored uploaded avatars and images.
- `database/` — SQL schema and helper SQL files (`schema.sql`, `groups.sql`, `group_posts.sql`, `notification.sql`).

**Routing & Public API Endpoints**
The server route registrations are in `internal/servergo/runserver.go`. Below is a concise list of available routes, their HTTP method (typical), auth requirement and handler file reference. For exact behaviour examine the handler files.

- **/ws** — WebSocket tunnel for realtime notifications. Authenticated. Handler: [internal/handler/socke_tunnel.go](backend/internal/handler/socke_tunnel.go#L1-L200).
- **/uploads/** — Static file-serving for uploaded images. Public. Config at [internal/servergo/runserver.go](backend/internal/servergo/runserver.go#L1-L120).
- **/checkstate** — GET. Returns `{ authenticated: bool, userID?: id }`. Public. Handler: [internal/auth/checkstate.go](backend/internal/auth/checkstate.go#L1-L120).
- **/login** — POST. Login with JSON `{username, password}`. Sets `session` cookie. Handler: [internal/auth/login.go](backend/internal/auth/login.go#L1-L200).
- **/logout** — GET/POST. Clears `session` cookie. Handler: [internal/auth/logout.go](backend/internal/auth/logout.go#L1-L120).
- **/register** — POST (multipart/form-data). Registers user and accepts an `avatar` file. Handler: [internal/auth/register.go](backend/internal/auth/register.go#L1-L200).
- **/profile/** — Authenticated. See [internal/handler/profile.go](backend/internal/handler/profile.go#L1-L200).
- **/Createpost** — POST. Create a post (auth). Handler: [internal/handler/createpost.go](backend/internal/handler/createpost.go#L1-L200).
- **/getposts** — GET. Authenticated. Fetch posts. Handler: [internal/handler/getposts.go](backend/internal/handler/getposts.go#L1-L200).
- **/posts/** — POST (submit comment) or related comment routes; auth. Handler: [internal/handler/subcomment.go](backend/internal/handler/subcomment.go#L1-L200).
- **/reactions** — POST. Add reaction to post. Auth. Handler: [internal/handler/reaction.go](backend/internal/handler/reaction.go#L1-L200).
- **/users-sug** — GET. User suggestions for follows. Auth. Handler: [internal/handler/getuserssug.go](backend/internal/handler/getuserssug.go#L1-L200).
- **/toggle-follow** — POST. Follow/unfollow toggle. Auth. Handler: [internal/handler/setfollow.go](backend/internal/handler/setfollow.go#L1-L200).
- **/update-privacy** — POST. Update privacy settings. Auth. Handler: [internal/handler/update_privacy.go](backend/internal/handler/update_privacy.go#L1-L200).
- **/GetCUser/** — GET. Get posts for a user profile. Auth. Handler: [internal/handler/PostsByuser.go](backend/internal/handler/PostsByuser.go#L1-L200).
- **/Friends** — GET. Friend list. Auth. Handler: [internal/handler/getfriends.go](backend/internal/handler/getfriends.go#L1-L200).
- **/notifications** — GET. Notification list. Auth. Handler: [internal/handler/notification.go](backend/internal/handler/notification.go#L1-L200).
- **/request_follow** — POST. Accept/reject follow requests. Auth. Handler: [internal/handler/accept_reject_request.go](backend/internal/handler/accept_reject_request.go#L1-L200).
- **/Create_Group** — POST. Create group (auth). Handler: [internal/handler/create_group.go](backend/internal/handler/create_group.go#L1-L200).
- **/Get_Groups** — GET. List groups. Auth. Handler: [internal/handler/get_groups.go](backend/internal/handler/get_groups.go#L1-L200).
- **/join** — POST. Request to join group. Auth. Handler: [internal/handler/request_join_g.go](backend/internal/handler/request_join_g.go#L1-L200).
- **/accept-reject-join** — POST. Accept/reject group join. Auth. Handler: [internal/handler/accept_reject_join.go](backend/internal/handler/accept_reject_join.go#L1-L200).
- **/Get_Group_By_ID/** — GET. Group details by id. Auth. Handler: [internal/handler/get_groube_by_id.go](backend/internal/handler/get_groube_by_id.go#L1-L200).
- **/Creat_Post_Groupe** — POST. Create post inside a group. Auth. Handler: [internal/handler/Create_Post_Groupe.go](backend/internal/handler/Create_Post_Groupe.go#L1-L200).

Note: Many handlers expect the `session` cookie set by `/login`. Authentication middleware is in [internal/Middleware/middleware.go](backend/internal/Middleware/middleware.go#L1-L200) and will expose user ID through the request context.

**Database schema**
- Main schema: [backend/database/schema.sql](backend/database/schema.sql#L1-L200) — creates `users`, `sessions`, `posts`, `comments`.
- Groups: [backend/database/groups.sql](backend/database/groups.sql#L1-L200) — `groups`, `group_members`.
- Group posts: [backend/database/group_posts.sql](backend/database/group_posts.sql#L1-L200).
- Notifications: [backend/database/notification.sql](backend/database/notification.sql#L1-L200).

Behavior notes:
- DB file `database/forum.db` is created and schema applied on server start by `internal/Initialdb/db.go`.
- Shared DB object is `internal/repository.DB` (see [backend/internal/repository/global.go](backend/internal/repository/global.go#L1-L240)).
- Realtime notifications: `internal/repository` has `Clients` map and `Notification_01` channel used by the notification goroutine.

**Testing & Development**
- Local dev: run `go run main.go` and open the frontend at its dev server (Next.js) configured to call the backend at `http://localhost:8080`.
- Database inspection: the SQLite file is `backend/database/forum.db`. You can use `sqlite3` or a GUI DB browser to inspect tables.

**Contribution Guide**
- Code layout: keep logic in `internal/` packages.
- Adding endpoints:
  - Add handler function in `internal/handler/*.go`.
  - Register route in `internal/servergo/runserver.go` within `Mux()`.
  - Add DB migrations (SQL files) under `database/` and ensure `internal/Initialdb/CreateTable` applies them (or update to include new files).
- Style: keep functions short and prefer reporting errors back as JSON `{status, message}` similar to existing handlers.
- Sessions: authentication relies on `session` cookie set by `/login` and persisted in `sessions` table via the `set_get_data_base` helpers.

**Where to look for specific logic**
- User-related DB helpers: `backend/internal/set_get_data_base/user_interaction.go`.
- Post-related DB helpers: `backend/internal/set_get_data_base/post_interaction.go`.
- SQL queries: `backend/internal/repository/User_Query_db.go` and `User_Post_Query_db.go`.

**Next improvements (suggested)**
- Add a `Makefile` or `scripts` to initialize DB and run server easily.
- Add automated tests for handler logic and DB functions.
- Extract configuration (port, DB path) to environment variables.
- Document JSON request/response examples per endpoint.

---
Last updated: auto-generated documentation created inside repository.
