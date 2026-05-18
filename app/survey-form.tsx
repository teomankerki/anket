"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { SurveyQuestion } from "@/lib/survey";

type SingleOtherAnswer = {
  choice: string;
  otherText: string;
};

type MultipleOtherAnswer = {
  choices: string[];
  otherSelected: boolean;
  otherText: string;
};

type AnswerValue = string | string[] | SingleOtherAnswer | MultipleOtherAnswer;
type AnswerMap = Record<string, AnswerValue>;

function isSingleOtherAnswer(value: AnswerValue | undefined): value is SingleOtherAnswer {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "choice" in value);
}

function isMultipleOtherAnswer(value: AnswerValue | undefined): value is MultipleOtherAnswer {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "choices" in value);
}

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

  function updateSingleOther(questionId: string, patch: Partial<SingleOtherAnswer>) {
    setAnswers((current) => {
      const currentAnswer =
        typeof current[questionId] === "object" && !Array.isArray(current[questionId])
          ? (current[questionId] as Partial<SingleOtherAnswer>)
          : {};

      return {
        ...current,
        [questionId]: {
          choice: currentAnswer.choice || "__other__",
          otherText: currentAnswer.otherText || "",
          ...patch
        }
      };
    });
    setErrors((current) => ({ ...current, [questionId]: "" }));
  }

  function updateMultiple(questionId: string, value: string, checked: boolean) {
    setAnswers((current) => {
      const currentAnswer = current[questionId];
      const currentValues = Array.isArray(currentAnswer)
        ? currentAnswer
        : typeof currentAnswer === "object" && currentAnswer && "choices" in currentAnswer
          ? (currentAnswer.choices as string[])
          : [];
      const nextValues = checked
        ? Array.from(new Set([...currentValues, value]))
        : currentValues.filter((currentValue) => currentValue !== value);

      if (typeof currentAnswer === "object" && currentAnswer && "choices" in currentAnswer) {
        return { ...current, [questionId]: { ...currentAnswer, choices: nextValues } };
      }

      return { ...current, [questionId]: nextValues };
    });
    setErrors((current) => ({ ...current, [questionId]: "" }));
  }

  function updateMultipleOther(questionId: string, patch: Partial<MultipleOtherAnswer>) {
    setAnswers((current) => {
      const currentAnswer = current[questionId];
      const currentValues = Array.isArray(currentAnswer)
        ? currentAnswer
        : typeof currentAnswer === "object" && currentAnswer && "choices" in currentAnswer
          ? (currentAnswer.choices as string[])
          : [];
      const currentOther =
        typeof currentAnswer === "object" && currentAnswer && "choices" in currentAnswer
          ? (currentAnswer as Partial<MultipleOtherAnswer>)
          : {};

      return {
        ...current,
        [questionId]: {
          choices: currentValues,
          otherSelected: Boolean(currentOther.otherSelected),
          otherText: currentOther.otherText || "",
          ...patch
        }
      };
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
        const currentAnswer = answers[question.id];
        const singleOtherAnswer = isSingleOtherAnswer(currentAnswer) ? currentAnswer : null;
        const multipleOtherAnswer = isMultipleOtherAnswer(currentAnswer) ? currentAnswer : null;

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
                {question.allowOther ? (
                  <div className="other-choice">
                    <label className="choice-row">
                      <input
                        checked={singleOtherAnswer?.choice === "__other__"}
                        name={question.id}
                        onChange={() => updateSingleOther(question.id, { choice: "__other__" })}
                        required={question.required}
                        type="radio"
                      />
                      <span>Other</span>
                    </label>
                    {singleOtherAnswer?.choice === "__other__" ? (
                      <input
                        aria-label={`${question.title} other answer`}
                        className="other-input"
                        onChange={(event) => updateSingleOther(question.id, { otherText: event.target.value })}
                        placeholder="Enter your answer"
                        required={question.required}
                        type="text"
                        value={singleOtherAnswer.otherText}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {question.type === "multiple" ? (
              <div className="option-list">
                {question.options.map((option) => {
                  const currentValues = Array.isArray(currentAnswer)
                    ? currentAnswer
                    : multipleOtherAnswer
                      ? multipleOtherAnswer.choices
                      : [];

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
                {question.allowOther ? (
                  <div className="other-choice">
                    <label className="choice-row">
                      <input
                        checked={Boolean(multipleOtherAnswer?.otherSelected)}
                        onChange={(event) =>
                          updateMultipleOther(question.id, { otherSelected: event.target.checked })
                        }
                        type="checkbox"
                      />
                      <span>Other</span>
                    </label>
                    {multipleOtherAnswer?.otherSelected ? (
                      <input
                        aria-label={`${question.title} other answer`}
                        className="other-input"
                        onChange={(event) => updateMultipleOther(question.id, { otherText: event.target.value })}
                        placeholder="Enter your answer"
                        required={question.required}
                        type="text"
                        value={multipleOtherAnswer.otherText}
                      />
                    ) : null}
                  </div>
                ) : null}
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
