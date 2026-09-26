#!/usr/bin/env bash
#
# First-time setup for a fresh server: Ubuntu 24.04 on Oracle Cloud Always Free.
# Safe to re-run; each step is idempotent.
#
#   scp -i <key> deploy/bootstrap.sh ubuntu@<your-vm-ip>:~/
#   ssh -i <key> ubuntu@<your-vm-ip> 'bash ~/bootstrap.sh'
#
# After this finishes, deploy with:
#   git clone <your-repo-url> ~/app && cd ~/app
#   DOMAIN=example.com APP_UID=$(id -u) APP_GID=$(id -g) ./deploy/deploy.sh
#
# Note on architecture: the Always Free Ampere A1 shape is arm64, and both
# images build for it natively, because the Go and Node base images are
# multi-arch and Docker selects the host's architecture. The SQLite dependency
# compiles with CGO, which works because the builder image ships gcc.

set -euo pipefail

log() { printf '\n\033[36m==> %s\033[0m\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
    echo "bootstrap.sh needs root: sudo bash bootstrap.sh" >&2
    exit 1
fi

log "installing Docker from the official repository"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor --batch -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

. /etc/os-release
arch="$(dpkg --print-architecture)"
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] %s\n' \
    "$arch" "https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y --no-install-recommends \
    ca-certificates curl git ufw

# The Compose plugin is what the deploy script uses.
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
usermod -aG docker "${SUDO_USER:-ubuntu}"

log "opening ports 80 and 443 (Oracle also needs its own security list opened)"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

log "creating /srv/social-network"
mkdir -p /srv/social-network
chown "${SUDO_USER:-ubuntu}":"${SUDO_USER:-ubuntu}" /srv/social-network

log "done"
cat <<'NEXT'
Next steps, all runnable as the non-root user:

  1. In the Oracle console, confirm the VCN security list allows inbound
     TCP 80 and 443 (and TCP 22 for SSH). ufw alone is not enough.

  2. Point your domain's A record at this server's public IP.

  3. Clone and deploy:

       git clone <your-repo-url> ~/app
       cd ~/app
       DOMAIN=example.com APP_UID=$(id -u) APP_GID=$(id -g) ./deploy/deploy.sh

     The first run builds both images, which takes several minutes. The Go
     build is the slow part; later runs reuse the Docker layer cache.
NEXT
