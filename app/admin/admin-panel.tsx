"use client";

import {
  Download,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Trash2,
  Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import type { QuestionType, SurveyConfig, SurveyQuestion, SurveyResponse } from "@/lib/survey";

type SaveState = "idle" | "saving" | "saved" | "error";

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: "single", label: "Choose one" },
  { value: "multiple", label: "Choose multiple" },
  { value: "text", label: "Text" }
];

function createQuestion(type: QuestionType): SurveyQuestion {
  return {
    id: crypto.randomUUID(),
    title: "",
    type,
    required: true,
    options: type === "text" ? [] : ["Option 1", "Option 2"],
    allowOther: false
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AdminPanel({
  initialConfig,
  recentResponses,
  responseCount
}: {
  initialConfig: SurveyConfig;
  recentResponses: SurveyResponse[];
  responseCount: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<SurveyConfig>(initialConfig);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");

  const questionCountLabel = useMemo(() => {
    const count = config.questions.length;
    return `${count} question${count === 1 ? "" : "s"}`;
  }, [config.questions.length]);

  function updateConfig(patch: Partial<SurveyConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
    setSaveState("idle");
  }

  function updateQuestion(questionId: string, patch: Partial<SurveyQuestion>) {
    updateConfig({
      questions: config.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      )
    });
  }

  function updateQuestionType(question: SurveyQuestion, type: QuestionType) {
    updateQuestion(question.id, {
      type,
      options: type === "text" ? [] : question.options.length > 0 ? question.options : ["Option 1"],
      allowOther: type !== "text" && question.allowOther
    });
  }

  function addQuestion(type: QuestionType) {
    updateConfig({ questions: [...config.questions, createQuestion(type)] });
  }

  function removeQuestion(questionId: string) {
    updateConfig({ questions: config.questions.filter((question) => question.id !== questionId) });
  }

  function updateOption(question: SurveyQuestion, index: number, value: string) {
    const nextOptions = question.options.map((option, optionIndex) => (optionIndex === index ? value : option));
    updateQuestion(question.id, { options: nextOptions });
  }

  function addOption(question: SurveyQuestion) {
    updateQuestion(question.id, { options: [...question.options, `Option ${question.options.length + 1}`] });
  }

  function removeOption(question: SurveyQuestion, index: number) {
    updateQuestion(question.id, { options: question.options.filter((_, optionIndex) => optionIndex !== index) });
  }

  function readHeaderImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    if (file.size > 1_500_000) {
      setError("Choose an image smaller than 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      updateConfig({ headerImage: typeof reader.result === "string" ? reader.result : "" });
      setError("");
    });
    reader.readAsDataURL(file);
  }

  async function saveConfig() {
    setSaveState("saving");
    setError("");

    const response = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    const payload = (await response.json()) as { config?: SurveyConfig; error?: string };

    if (!response.ok || !payload.config) {
      setSaveState("error");
      setError(payload.error || "Unable to save survey.");
      return;
    }

    setConfig(payload.config);
    setSaveState("saved");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">Anket</p>
          <h1>{config.name || "Untitled survey"}</h1>
        </div>
        <div className="admin-actions">
          <a className="secondary-button" href="/api/admin/export" title="Download Excel">
            <Download size={18} />
            Export
          </a>
          <button className="secondary-button" onClick={logout} title="Sign out" type="button">
            <LogOut size={18} />
            Sign out
          </button>
          <button className="primary-button" disabled={saveState === "saving"} onClick={saveConfig} type="button">
            <Save size={18} />
            {saveState === "saving" ? "Saving" : "Save"}
          </button>
        </div>
      </header>

      <div className="admin-grid">
        <section className="admin-section survey-settings">
          <div className="section-heading">
            <h2>Survey</h2>
            <span>{questionCountLabel}</span>
          </div>

          <label>
            Name
            <input
              onChange={(event) => updateConfig({ name: event.target.value })}
              type="text"
              value={config.name}
            />
          </label>

          <label>
            Color
            <span className="color-input-row">
              <input
                aria-label="Survey color"
                onChange={(event) => updateConfig({ primaryColor: event.target.value })}
                type="color"
                value={config.primaryColor}
              />
              <input
                aria-label="Survey color hex"
                onChange={(event) => updateConfig({ primaryColor: event.target.value })}
                spellCheck={false}
                type="text"
                value={config.primaryColor}
              />
            </span>
          </label>

          <label>
            Header image
            <span className="image-control-row">
              <input
                onChange={(event) => updateConfig({ headerImage: event.target.value })}
                placeholder="https://..."
                type="url"
                value={config.headerImage.startsWith("data:") ? "" : config.headerImage}
              />
              <button
                className="icon-button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload image"
                type="button"
              >
                <Upload size={18} />
              </button>
              <input
                accept="image/*"
                className="hidden-input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    readHeaderImage(file);
                  }
                }}
                ref={fileInputRef}
                type="file"
              />
            </span>
          </label>

          <div className="header-preview" style={{ "--accent": config.primaryColor } as CSSProperties}>
            {config.headerImage ? <img alt="" src={config.headerImage} /> : <ImagePlus size={32} />}
          </div>

          <div className="status-line" data-state={saveState}>
            {saveState === "saved" ? "Saved" : saveState === "error" ? "Not saved" : "\u00a0"}
          </div>
          {error ? <p className="field-error">{error}</p> : null}
        </section>

        <section className="admin-section results-section">
          <div className="section-heading">
            <h2>Results</h2>
            <span>{responseCount}</span>
          </div>
          <div className="metric-row">
            <strong>{responseCount}</strong>
            <span>responses</span>
          </div>
          <div className="recent-list">
            {recentResponses.length > 0 ? (
              recentResponses.map((response) => (
                <div className="recent-response" key={response.id}>
                  <span>{formatDate(response.createdAt)}</span>
                  <small>{response.answers.length} answers</small>
                </div>
              ))
            ) : (
              <div className="empty-state compact">No responses yet.</div>
            )}
          </div>
        </section>
      </div>

      <section className="question-toolbar">
        <h2>Questions</h2>
        <div className="toolbar-actions">
          <button className="secondary-button" onClick={() => addQuestion("single")} type="button">
            <Plus size={18} />
            One
          </button>
          <button className="secondary-button" onClick={() => addQuestion("multiple")} type="button">
            <Plus size={18} />
            Multiple
          </button>
          <button className="secondary-button" onClick={() => addQuestion("text")} type="button">
            <Plus size={18} />
            Text
          </button>
        </div>
      </section>

      <section className="question-editor-list">
        {config.questions.length > 0 ? (
          config.questions.map((question, questionIndex) => (
            <article className="question-editor" key={question.id}>
              <div className="question-editor-head">
                <span>{questionIndex + 1}</span>
                <input
                  aria-label={`Question ${questionIndex + 1} title`}
                  onChange={(event) => updateQuestion(question.id, { title: event.target.value })}
                  placeholder="Question"
                  type="text"
                  value={question.title}
                />
                <button
                  className="icon-button danger"
                  onClick={() => removeQuestion(question.id)}
                  title="Delete question"
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="question-meta-row">
                <select
                  aria-label="Question type"
                  onChange={(event) => updateQuestionType(question, event.target.value as QuestionType)}
                  value={question.type}
                >
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <label className="toggle-row">
                  <input
                    checked={question.required}
                    onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                    type="checkbox"
                  />
                  Required
                </label>
              </div>

              {question.type !== "text" ? (
                <div className="option-editor-list">
                  {question.options.map((option, optionIndex) => (
                    <div className="option-editor" key={`${question.id}-${optionIndex}`}>
                      <input
                        aria-label={`Option ${optionIndex + 1}`}
                        onChange={(event) => updateOption(question, optionIndex, event.target.value)}
                        type="text"
                        value={option}
                      />
                      <button
                        className="icon-button"
                        disabled={question.options.length <= 1}
                        onClick={() => removeOption(question, optionIndex)}
                        title="Delete option"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button className="secondary-button small" onClick={() => addOption(question)} type="button">
                    <Plus size={16} />
                    Option
                  </button>
                  <label className="toggle-row option-extra-row">
                    <input
                      checked={question.allowOther}
                      onChange={(event) => updateQuestion(question.id, { allowOther: event.target.checked })}
                      type="checkbox"
                    />
                    Other text option
                  </label>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="empty-state">No questions yet.</div>
        )}
      </section>
    </main>
  );
}
