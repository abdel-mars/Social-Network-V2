SHELL := /bin/bash
.PHONY: help backend-run backend-init-db frontend-run dev init-db

help:
	@echo "Makefile targets:"
	@echo "  backend-init-db   - Initialize SQLite DB from SQL files (requires sqlite3)"
	@echo "  backend-run       - Run the backend server (Go)"
	@echo "  frontend-run      - Run the frontend dev server (npm)"
	@echo "  dev               - Init DB then start backend and frontend (parallel)"

backend-init-db:
	@echo "Initializing backend SQLite DB..."
	@# run full init inside a single shell so we can early-skip cleanly
	@bash -c '\
	if [ -f backend/database/forum.db ]; then \
		echo "backend/database/forum.db already exists — skipping DB init"; \
	else \
		command -v sqlite3 >/dev/null 2>&1 || { echo "sqlite3 not found; install sqlite3 or run \"make backend-run\" to let the server create the DB automatically"; exit 0; }; \
		mkdir -p backend/database; \
		sqlite3 backend/database/forum.db < backend/database/schema.sql; \
		sqlite3 backend/database/forum.db < backend/database/groups.sql; \
		sqlite3 backend/database/forum.db < backend/database/group_posts.sql; \
		sqlite3 backend/database/forum.db < backend/database/notification.sql; \
		echo "Database initialized at backend/database/forum.db"; \
	fi'

backend-run:
	@command -v go >/dev/null 2>&1 || { echo "go executable not found; please install Go to run the backend"; exit 1; }
	@cd backend && go mod tidy && go run main.go

frontend-run:
	@command -v npm >/dev/null 2>&1 || { echo "npm not found; please install Node.js and npm to run the frontend"; exit 1; }
	@cd frontend && \
	if [ ! -d node_modules ]; then \
		echo "node_modules not found — running npm install"; \
		npm install --no-audit --no-fund; \
	else \
		echo "node_modules present — skipping npm install"; \
	fi && \
	if [ ! -d node_modules/emoji-picker-react ]; then \
		echo "emoji-picker-react not found — installing"; \
		npm install emoji-picker-react --no-audit --no-fund; \
	fi && npm run dev

dev: backend-init-db
	@echo "Starting backend and frontend (logs will be printed to this terminal). Press Ctrl-C to stop."
	@$(MAKE) backend-run & \
	PID_BACK=$$!; \
	$(MAKE) frontend-run & \
	PID_FRONT=$$!; \
	wait $$PID_BACK $$PID_FRONT

init-db: backend-init-db
