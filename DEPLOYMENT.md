# XConfess Deployment

This repo deploys as two apps plus managed services:

- `xconfess-backend`: NestJS API on port `5000`.
- `xconfess-frontend`: Next.js app on port `3000`.
- PostgreSQL: required.
- Redis: required when `ENABLE_BACKGROUND_JOBS=true`.

## Local Smoke Start

From the repo root:

```powershell
npm install
docker compose up -d postgres redis
npm run dev:backend
npm run dev:frontend
```

Backend liveness:

```powershell
Invoke-WebRequest -Uri http://localhost:5000/api/health/live -UseBasicParsing
```

Backend readiness:

```powershell
Invoke-WebRequest -Uri http://localhost:5000/api/health/ready -UseBasicParsing
```

If Docker says the `dockerDesktopLinuxEngine` pipe does not exist, start Docker Desktop and make sure it is using Linux containers.

## Production Environment

Never deploy the local `.env` values. Generate real secrets and put them in your hosting provider's secret manager.

Required backend variables:

```env
NODE_ENV=production
APP_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain
BACKEND_URL=https://your-backend-domain

DB_HOST=your-postgres-host
DB_PORT=5432
DB_USERNAME=your-postgres-user
DB_PASSWORD=your-postgres-password
DB_NAME=your-postgres-database
DB_READ_HOST=
DB_READ_PORT=
TYPEORM_SYNCHRONIZE=false
TYPEORM_MIGRATIONS_RUN=true

JWT_SECRET=generate-a-strong-32-plus-character-secret
APP_SECRET=generate-a-strong-32-plus-character-secret
CONFESSION_ENCRYPTION_KEY=64-hex-characters
ENCRYPTION_CURRENT_KEY_VERSION=v1
ENCRYPTION_MASTER_KEY_v1=64-hex-characters

ENABLE_BACKGROUND_JOBS=true
REDIS_HOST=your-redis-host
REDIS_PORT=6379

STELLAR_FEATURES_ENABLED=false
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-rpc-testnet.stellar.org
CONFESSION_ANCHOR_CONTRACT_ID=CBFR2MDZBQPTNBIJCT32MTDDQLW2AQNDWNO777F3QT6ANYKTHETQZWD3
REPUTATION_BADGES_CONTRACT_ID=CDD7WPESW54SN6YTXY7PH6JLG6S4MWNREHN5FD6XENAITEDOVLWKIQTC
TIPPING_SYSTEM_CONTRACT_ID=CAJK27UHTBUGQFUMN5TG5LOQXYODT6NHOY7Z5DVRRMR7CZ4SCIZUE5A3
STELLAR_SERVER_SECRET=

MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_SECURE=false
MAIL_FROM=noreply@your-domain
MAIL_USER=your-smtp-user
MAIL_PASSWORD=your-smtp-password
```

Required frontend variables:

```env
BACKEND_API_URL=https://your-backend-domain/api
NEXT_PUBLIC_API_URL=https://your-backend-domain/api
NEXT_PUBLIC_WS_URL=wss://your-backend-domain
NEXT_PUBLIC_APP_URL=https://your-frontend-domain
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_CONTRACT_ID=CBFR2MDZBQPTNBIJCT32MTDDQLW2AQNDWNO777F3QT6ANYKTHETQZWD3
NEXT_PUBLIC_DEV_BYPASS_AUTH=false
```

Generate backend secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the base64 values for `JWT_SECRET` and `APP_SECRET`. Use the 64-character hex value for `CONFESSION_ENCRYPTION_KEY`.

## Container Deployment

Build backend:

```powershell
docker build -f Dockerfile.backend -t xconfess-backend .
```

Build frontend:

```powershell
docker build -f Dockerfile.frontend -t xconfess-frontend `
  --build-arg BACKEND_API_URL=https://your-backend-domain/api `
  --build-arg NEXT_PUBLIC_API_URL=https://your-backend-domain/api `
  --build-arg NEXT_PUBLIC_WS_URL=wss://your-backend-domain `
  --build-arg NEXT_PUBLIC_APP_URL=https://your-frontend-domain .
```

Start the backend only after Postgres and Redis are reachable. The backend exposes `/api/health/live` for process health and `/api/health/ready` for dependency readiness.

## CI/CD Gates

Fast deploy gate for app hosts:

```powershell
npm run ci:apps
```

Full repo gate:

```powershell
npm run ci
```

The full gate includes frontend type-checking, frontend tests, backend tests, and Rust contract tests. Contract tests need enough free disk space for the MSVC linker on Windows.
