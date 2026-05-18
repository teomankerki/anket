import { getSurveyConfig, getSurveyResponseCount, getSurveyResponses } from "@/lib/survey";
import { isAdminAuthenticated } from "@/lib/auth";
import { getPublicDatabaseError } from "@/lib/errors";
import { AdminPanel } from "./admin-panel";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="admin-shell">
      <section className="setup-panel">
        <p className="eyebrow">Setup</p>
        <h1>Database unavailable</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <LoginForm />;
  }

  try {
    const [config, responseCount, recentResponses] = await Promise.all([
      getSurveyConfig(),
      getSurveyResponseCount(),
      getSurveyResponses(5)
    ]);

    return <AdminPanel initialConfig={config} recentResponses={recentResponses} responseCount={responseCount} />;
  } catch (error) {
    return <SetupNotice message={getPublicDatabaseError(error)} />;
  }
}
