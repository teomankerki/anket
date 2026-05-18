import type { CSSProperties } from "react";
import { getSurveyConfig } from "@/lib/survey";
import { getPublicDatabaseError } from "@/lib/errors";
import { SurveyForm } from "./survey-form";

export const dynamic = "force-dynamic";

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="setup-shell">
      <section className="setup-panel">
        <p className="eyebrow">Setup</p>
        <h1>Survey database unavailable</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

export default async function Home() {
  try {
    const config = await getSurveyConfig();
    const accentStyle = { "--accent": config.primaryColor } as CSSProperties;

    return (
      <main className="survey-shell" style={accentStyle}>
        <section className="survey-frame">
          {config.headerImage ? (
            <img className="survey-header-image" src={config.headerImage} alt="" />
          ) : (
            <div className="survey-header-fallback" aria-hidden="true" />
          )}

          <div className="survey-heading">
            <h1>{config.name}</h1>
          </div>

          {config.questions.length > 0 ? (
            <SurveyForm questions={config.questions} />
          ) : (
            <div className="empty-state">This survey is not open yet.</div>
          )}
        </section>
      </main>
    );
  } catch (error) {
    return <SetupNotice message={getPublicDatabaseError(error)} />;
  }
}
