# Deploying

The app is two services behind one reverse proxy:

```
                  :80 / :443
                        |
                     Caddy  ── /api/*    ──▶  Go backend  (:8080)
                        │   ── /uploads/* ──▶  SQLite + uploaded files
                        └── everything else ──▶  Next.js    (:3000)
```

One origin is the point. Because the pages and the API share a hostname, the
session cookie stays `SameSite=Lax` and CORS never comes into play, so there is
no cross-site cookie handling to get wrong in production.

## Provision a server

Oracle Cloud Always Free is the only host that gives you a real disk for free.
Free container tiers from Render, Koyeb and the like run on ephemeral
filesystems, which would wipe the SQLite database and every uploaded file on
each deploy.

1. Create a free account at <https://www.oracle.com/cloud/free/>. A card is
   required for verification, but Always Free resources are not charged.
2. In the console, open **Compute → Create instance** and pick
   `VM.Standard.A1.Flex` (Ampere A1, arm64) with 2 OCPU and 12 GB. The shape
   is free, and the whole monthly allocation fits in one instance.
3. Generate an SSH key pair if you do not already have one, and download the
   private key. It is offered only once.
4. Create a **block volume** of 50 GB and attach it.
5. Boot **Ubuntu 24.04** or Oracle Linux.

Two things commonly go wrong here:

- **"Out of host capacity"** means the region's free pool is empty. It is
  transient and regional. Retry, or switch the home region.
- **A1 is arm64.** The images build for it without changes, because the Go and
  Node base images are multi-arch and Docker picks the host architecture. The
  SQLite driver needs CGO, which works since the Go builder image ships gcc.

## First deploy

On your workstation:

```bash
scp -i <key> deploy/bootstrap.sh ubuntu@<vm-ip>:~/
ssh -i <key> ubuntu@<vm-ip> 'sudo bash ~/bootstrap.sh'
```

Then point your domain's A record at the VM's public IP and, on the server:

```bash
git clone <your-repo-url> ~/app
cd ~/app
DOMAIN=example.com APP_UID=$(id -u) APP_GID=$(id -g) ./deploy/deploy.sh
```

Caddy requests a Let's Encrypt certificate for `DOMAIN` on the first request.
Until that completes, HTTPS fails, so give it a minute and watch
`docker compose logs -f caddy` if it does not come up right away.

Oracle's VCN **security list** must also allow inbound TCP 80 and 443. The
`ufw` rules that `bootstrap.sh` sets are not sufficient on their own; Oracle
filters traffic before it reaches the instance.

## Redeploying

```bash
cd ~/app
git pull
DOMAIN=example.com APP_UID=$(id -u) APP_GID=$(id -g) ./deploy/deploy.sh
```

## Running it locally in containers

To check the proxy behaviour without a domain, serve plain HTTP on 8080:

```bash
APP_UID=$(id -u) APP_GID=$(id -g) DOMAIN=:8080 \
  docker compose -f docker/docker-compose.yml -f docker/docker-compose.local.yml up -d --build
```

Then open <http://localhost:8080>. The override file exists only to publish
port 8080; production maps 80 and 443.

For day-to-day development prefer `./run.sh`, which runs the backend and the
Next.js dev server directly on 3000 and 8080.

## Where state lives

Two bind mounts, neither of which is in git:

| Path                  | Contents                                        |
| --------------------- | ----------------------------------------------- |
| `backend/database/`   | `forum.db`, the SQLite database                 |
| `backend/uploads/`    | uploaded images, referenced as `uploads/<file>`  |

They survive rebuilds because they are mounted into the container, not baked
into the image. Back them up together; the database stores the file names.

## Configuration

| Variable        | Where                        | Purpose                                              |
| --------------- | ---------------------------- | ---------------------------------------------------- |
| `DOMAIN`        | `docker-compose.yml`         | Public hostname. Caddy derives HTTPS from it.        |
| `APP_UID`/`APP_GID` | `docker-compose.yml`     | Runs the backend as the host user, for the mounts.   |
| `PORT`          | `Dockerfile.backend`         | Backend listen port, default 8080.                   |
| `NEXT_PUBLIC_API_URL` | `run.sh` (dev only)      | Overrides the browser's own origin. Unset in the image, so one build works on any domain. |

`frontend/src/app/lib/api.js` decides where the API lives: the build-time
`NEXT_PUBLIC_API_URL` if set, otherwise the page's own origin, otherwise
`localhost:8080`. That is why the production image is domain-agnostic and why
`run.sh` has to set the variable for development.
