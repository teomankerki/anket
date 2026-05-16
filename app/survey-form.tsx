"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { SurveyQuestion } from "@/lib/survey";

type AnswerMap = Record<string, string | string[]>;

export function SurveyForm({ questions }: { questions: SurveyQuestion[] }) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requiredQuestionIds = useMemo(
    () => new Set(questions.filter((question) => question.required).map((question) => question.id)),
    [questions]
  );

  function updateSingle(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setErrors((current) => ({ ...current, [questionId]: "" }));
  }

  function updateMultiple(questionId: string, value: string, checked: boolean) {
    setAnswers((current) => {
      const currentValues = Array.isArray(current[questionId]) ? (current[questionId] as string[]) : [];
      const nextValues = checked
        ? Array.from(new Set([...currentValues, value]))
        : currentValues.filter((currentValue) => currentValue !== value);

      return { ...current, [questionId]: nextValues };
    });
    setErrors((current) => ({ ...current, [questionId]: "" }));
  }

  async function submitSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    const response = await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    });
    const payload = (await response.json()) as { ok?: boolean; errors?: Record<string, string> };

    setSubmitting(false);

    if (!response.ok || !payload.ok) {
      setErrors(payload.errors || {});
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="submitted-state">
        <h2>Thanks</h2>
        <p>Your response has been recorded.</p>
      </div>
    );
  }

  return (
    <form className="survey-form" onSubmit={submitSurvey}>
      {questions.map((question, index) => {
        const questionError = errors[question.id];

        return (
          <fieldset className="question-block" key={question.id}>
            <legend>
              <span>{index + 1}.</span>
              {question.title}
              {requiredQuestionIds.has(question.id) ? <strong>Required</strong> : null}
            </legend>

            {question.type === "text" ? (
              <textarea
                aria-invalid={Boolean(questionError)}
                aria-label={question.title}
                onChange={(event) => updateSingle(question.id, event.target.value)}
                required={question.required}
                rows={4}
                value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
              />
            ) : null}

            {question.type === "single" ? (
              <div className="option-list">
                {question.options.map((option) => (
                  <label className="choice-row" key={option}>
                    <input
                      checked={answers[question.id] === option}
                      name={question.id}
                      onChange={() => updateSingle(question.id, option)}
                      required={question.required}
                      type="radio"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {question.type === "multiple" ? (
              <div className="option-list">
                {question.options.map((option) => {
                  const currentValues = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];

                  return (
                    <label className="choice-row" key={option}>
                      <input
                        checked={currentValues.includes(option)}
                        onChange={(event) => updateMultiple(question.id, option, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {questionError ? <p className="field-error">{questionError}</p> : null}
          </fieldset>
        );
      })}

      <button className="primary-button survey-submit" disabled={submitting} type="submit">
        {submitting ? "Submitting" : "Submit"}
      </button>
    </form>
  );
}
