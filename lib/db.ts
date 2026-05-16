import pg from "pg";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var anketPool: pg.Pool | undefined;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS survey_config (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name text NOT NULL DEFAULT 'Untitled survey',
    primary_color text NOT NULL DEFAULT '#2563eb',
    header_image text NOT NULL DEFAULT '',
    questions jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `INSERT INTO survey_config (id, name, primary_color, header_image, questions)
   VALUES (1, 'Untitled survey', '#2563eb', '', '[]'::jsonb)
   ON CONFLICT (id) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS survey_responses (
    id uuid PRIMARY KEY,
    survey_name text NOT NULL,
    answers jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`
];

let schemaReady: Promise<void> | undefined;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

export function getPool() {
  if (!globalThis.anketPool) {
    globalThis.anketPool = new Pool({
      connectionString: getDatabaseUrl()
    });
  }

  return globalThis.anketPool;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();

      for (const statement of schemaStatements) {
        await pool.query(statement);
      }
    })();
  }

  return schemaReady;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  await ensureSchema();
  return getPool().query<T>(text, params);
}
