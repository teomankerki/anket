export function getPublicDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Check DATABASE_URL and Postgres connectivity.";
  }

  if (error.message.includes("ENOTFOUND")) {
    const host = error.message.split(" ").at(-1) || "the configured host";

    return `Database host "${host}" could not be found. In Coolify, set DATABASE_URL to the internal Postgres connection string for your database resource.`;
  }

  if (error.message.includes("password authentication failed")) {
    return "Database login failed. Check the username and password in DATABASE_URL.";
  }

  if (error.message.includes("ECONNREFUSED")) {
    return "Database connection was refused. Check that the Postgres resource is running and reachable from this app.";
  }

  return error.message;
}
