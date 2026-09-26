#!/usr/bin/env bash
#
# Social-Network-V2 - start the backend (:8080) and frontend (:3000) together.
#
#   backend   Go HTTP server      (cd backend  && go run main.go)
#   frontend  Next.js dev server  (cd frontend && npm run dev)
#
# Ctrl-C stops both process trees. Full logs are kept in $LOG_DIR.

set -uo pipefail
set -m # each background job gets its own process group, so we can kill whole trees

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

BACKEND_PORT=8080
FRONTEND_PORT=3000

LOG_DIR="${TMPDIR:-/tmp}/social-network-v2"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

C_RESET=$'\033[0m'
C_BLUE=$'\033[36m'
C_MAGENTA=$'\033[35m'
C_RED=$'\033[31m'
C_BOLD=$'\033[1m'

# Process groups to tear down on exit: backend, frontend, and the two log tails.
PGIDS=()

fail() { printf '%s✗ %s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }

# Echo the PID listening on $1, or nothing when the port is free.
listener_pid() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null | head -n1
    else
        ss -tlnpH "sport = :${port}" 2>/dev/null |
            grep -oE 'pid=[0-9]+' | head -n1 | cut -d= -f2
    fi
}

# Report *what* holds a port, so the fix is obvious, then bail out.
require_free_port() {
    local port="$1" label="$2" pid cmd cwd
    pid="$(listener_pid "$port")"
    [ -n "$pid" ] || return 0
    cmd="$(ps -p "$pid" -o args= 2>/dev/null)"
    cwd="$(readlink -f "/proc/${pid}/cwd" 2>/dev/null || echo unknown)"
    fail "port ${port} (${label}) is already in use"
    printf '    pid : %s\n    cmd : %s\n    cwd : %s\n' \
        "$pid" "${cmd:-unknown}" "$cwd" >&2
    printf '    fix : kill %s   (then re-run ./run.sh)\n\n' "$pid" >&2
    return 1
}

for tool in go node npm; do
    command -v "$tool" >/dev/null 2>&1 ||
        fail "'${tool}' is not installed or not on PATH"
done

require_free_port "$BACKEND_PORT" backend || exit 1
require_free_port "$FRONTEND_PORT" frontend || exit 1

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    printf 'frontend deps missing - running npm install (one time)...\n'
    (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund) ||
        fail "npm install failed"
fi

mkdir -p "$LOG_DIR"
: >"$BACKEND_LOG"
: >"$FRONTEND_LOG"

cleanup() {
    trap - INT TERM EXIT
    printf '\n%sstopping...%s\n' "$C_BOLD" "$C_RESET"
    local group
    for group in "${PGIDS[@]}"; do kill -TERM -- "-${group}" 2>/dev/null; done
    sleep 1
    for group in "${PGIDS[@]}"; do kill -KILL -- "-${group}" 2>/dev/null; done
    wait 2>/dev/null
    printf '%sstopped.%s\n' "$C_BOLD" "$C_RESET"
}
trap cleanup INT TERM EXIT

# `exec` inside a subshell keeps the PID as the process-group leader, so
# `kill -- -$PGID` takes down the entire tree. The Makefile's `wait $$PID_BACK`
# captures make's PID instead, which leaks go run's child binary.
(cd "$BACKEND_DIR" && exec go run main.go) >"$BACKEND_LOG" 2>&1 &
BACKEND_PGID=$!
PGIDS+=("$BACKEND_PGID")

(cd "$FRONTEND_DIR" && exec npm run dev) >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PGID=$!
PGIDS+=("$FRONTEND_PGID")

printf '%sbackend%s  http://localhost:%s  (log: %s)\n' \
    "$C_BLUE" "$C_RESET" "$BACKEND_PORT" "$BACKEND_LOG"
printf '%sfrontend%s http://localhost:%s  (log: %s)\n' \
    "$C_MAGENTA" "$C_RESET" "$FRONTEND_PORT" "$FRONTEND_LOG"
printf '%sCtrl-C to stop both.%s\n\n' "$C_BOLD" "$C_RESET"

# Prefix each line with its service so interleaved output stays readable.
(tail -n0 -F "$BACKEND_LOG" | sed -u "s/^/${C_BLUE}[backend]${C_RESET} /") &
PGIDS+=("$!")

(tail -n0 -F "$FRONTEND_LOG" | sed -u "s/^/${C_MAGENTA}[frontend]${C_RESET} /") &
PGIDS+=("$!")

wait
