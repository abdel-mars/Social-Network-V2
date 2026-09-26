#!/usr/bin/env bash
#
# Build and run the stack on the server. Use this for the first deploy and for
# every deploy after it.
#
#   DOMAIN=example.com APP_UID=$(id -u) APP_GID=$(id -g) ./deploy/deploy.sh
#
# DOMAIN is the public hostname. Caddy serves it over HTTPS with an automatic
# Let's Encrypt certificate, so it must already resolve to this machine.
# APP_UID and APP_GID make the backend container run as the host user, which is
# what lets it write to the bind-mounted SQLite file and uploads directory.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${DOMAIN:-}" ]; then
    echo "DOMAIN is required, e.g. DOMAIN=example.com" >&2
    exit 1
fi
if [ -z "${APP_UID:-}" ] || [ -z "${APP_GID:-}" ]; then
    echo "APP_UID and APP_GID are required: APP_UID=\$(id -u) APP_GID=\$(id -g)" >&2
    exit 1
fi

COMPOSE=(docker compose -f docker/docker-compose.yml)
export DOMAIN APP_UID APP_GID

# The bind mounts are the database and the uploads directory, which are not in
# git. Without them the backend would start against an empty database and lose
# every uploaded file on the next rebuild.
mkdir -p backend/database backend/uploads

# Keep the service alive across reboots. The Docker package does this already;
# this covers the case where Docker was installed some other way.
if command -v systemctl >/dev/null 2>&1; then
    systemctl enable docker >/dev/null 2>&1 || true
fi

echo "==> building images"
"${COMPOSE[@]}" build

echo "==> starting services"
"${COMPOSE[@]}" up -d --remove-orphans

echo "==> waiting for the backend to report healthy"
for _ in $(seq 1 30); do
    status="$("${COMPOSE[@]}" ps --format '{{.Health}}' backend 2>/dev/null || true)"
    if [ "$status" = "healthy" ]; then
        break
    fi
    sleep 2
done

"${COMPOSE[@]}" ps

echo
echo "==> smoke test through the proxy"
curl -fsS -o /dev/null -w 'page   %{http_code}  https://%s/\n' "https://${DOMAIN}/"
curl -fsS -o /dev/null -w 'api    %{http_code}  https://%s/api/checkstate\n' "https://${DOMAIN}/"

cat <<NEXT

Deployed. Check it in a browser: https://${DOMAIN}/

If the certificate has not been issued yet, the first request can take a
minute while Caddy completes the ACME challenge. Follow progress with:

  ${COMPOSE[*]} logs -f caddy

Redeploy after a git pull:

  DOMAIN=${DOMAIN} APP_UID=\$(id -u) APP_GID=\$(id -g) ./deploy/deploy.sh
NEXT
