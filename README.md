# Anket

A small survey app designed for a public repository. It keeps secrets out of the frontend and stores survey responses in Postgres.

## Features

- Public survey page at `/`
- Admin panel at `/admin`
- Admin password from `ADMIN_PASSWORD`
- Server-signed HttpOnly admin session cookie
- Survey name, primary color, and header image controls
- Question types:
  - multiple choice, choose one
  - multiple choice, choose multiple
  - text
- Optional and required questions
- Postgres-backed survey config and responses
- Excel export from the admin panel

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file:

   ```bash
   cp .env.example .env.local
   ```

3. Update `.env.local`:

   ```bash
   DATABASE_URL="postgres://postgres:postgres@localhost:5432/anket"
   ADMIN_PASSWORD="replace-me"
   AUTH_SECRET="replace-me-with-a-long-random-string"
   ```

4. Start Postgres:

   ```bash
   docker compose up -d
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

The app creates the required tables automatically on first database access. The equivalent SQL is in `sql/schema.sql`.

## Public repo notes

Do not commit `.env`, `.env.local`, database dumps, exported spreadsheets, or `node_modules`. The included `.gitignore` already excludes those files. Only variables prefixed with `NEXT_PUBLIC_` are exposed to browser code in Next.js; this app does not use that prefix for the admin password.

## Coolify deployment

Add these environment variables to the application resource:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
ADMIN_PASSWORD="your-admin-password"
AUTH_SECRET="a-long-random-secret"
```

Use the internal connection string from the Coolify Postgres database resource. If the page says `getaddrinfo ENOTFOUND base`, the hostname in `DATABASE_URL` is wrong; it should usually be the database resource name or the internal host shown by Coolify, not `base`.
