import { randomUUID } from "crypto";
import { query } from "./db";

export type QuestionType = "single" | "multiple" | "text";

export type SurveyQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  allowOther: boolean;
};

export type SurveyConfig = {
  name: string;
  primaryColor: string;
  headerImage: string;
  questions: SurveyQuestion[];
  updatedAt?: string;
};

export type StoredAnswer = {
  questionId: string;
  title: string;
  type: QuestionType;
  required: boolean;
  value: string | string[];
};

export type SurveyResponse = {
  id: string;
  surveyName: string;
  answers: StoredAnswer[];
  createdAt: string;
};

type SurveyConfigRow = {
  name: string;
  primary_color: string;
  header_image: string;
  questions: unknown;
  updated_at: Date;
};

type SurveyResponseRow = {
  id: string;
  survey_name: string;
  answers: unknown;
  created_at: Date;
};

const defaultColor = "#2563eb";
const supportedTypes = new Set<QuestionType>(["single", "multiple", "text"]);
const otherPrefix = "Other:";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeText(value: unknown, fallback = "", maxLength = 200) {
  return asString(value, fallback).trim().slice(0, maxLength);
}

function normalizeColor(value: unknown) {
  const color = asString(value, defaultColor).trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : defaultColor;
}

function normalizeHeaderImage(value: unknown) {
  const headerImage = asString(value).trim();

  if (!headerImage) {
    return "";
  }

  if (headerImage.length > 2_000_000) {
    return "";
  }

  if (/^https?:\/\//i.test(headerImage) || /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(headerImage)) {
    return headerImage;
  }

  return "";
}

function normalizeType(value: unknown): QuestionType {
  return supportedTypes.has(value as QuestionType) ? (value as QuestionType) : "single";
}

export function normalizeSurveyConfig(input: unknown): SurveyConfig {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rawQuestions = Array.isArray(source.questions) ? source.questions : [];
  const questions = rawQuestions.slice(0, 50).flatMap((question) => {
    if (!question || typeof question !== "object") {
      return [];
    }

    const questionSource = question as Record<string, unknown>;
    const type = normalizeType(questionSource.type);
    const title = normalizeText(questionSource.title, "", 300);

    if (!title) {
      return [];
    }

    const options =
      type === "text"
        ? []
        : Array.from(
            new Set(
              (Array.isArray(questionSource.options) ? questionSource.options : [])
                .map((option) => normalizeText(option, "", 120))
                .filter(Boolean)
            )
          ).slice(0, 20);

    if (type !== "text" && options.length === 0) {
      return [];
    }

    return [
      {
        id: normalizeText(questionSource.id, randomUUID(), 80) || randomUUID(),
        title,
        type,
        required: Boolean(questionSource.required),
        options,
        allowOther: type !== "text" && Boolean(questionSource.allowOther)
      }
    ];
  });

  return {
    name: normalizeText(source.name, "Untitled survey", 120) || "Untitled survey",
    primaryColor: normalizeColor(source.primaryColor),
    headerImage: normalizeHeaderImage(source.headerImage),
    questions
  };
}

export async function getSurveyConfig() {
  const result = await query<SurveyConfigRow>(
    "SELECT name, primary_color, header_image, questions, updated_at FROM survey_config WHERE id = 1"
  );
  const row = result.rows[0];

  if (!row) {
    return normalizeSurveyConfig({});
  }

  return {
    name: row.name,
    primaryColor: normalizeColor(row.primary_color),
    headerImage: normalizeHeaderImage(row.header_image),
    questions: normalizeSurveyConfig({ questions: row.questions }).questions,
    updatedAt: row.updated_at.toISOString()
  } satisfies SurveyConfig;
}

export async function saveSurveyConfig(input: unknown) {
  const config = normalizeSurveyConfig(input);

  const result = await query<SurveyConfigRow>(
    `UPDATE survey_config
     SET name = $1, primary_color = $2, header_image = $3, questions = $4::jsonb, updated_at = now()
     WHERE id = 1
     RETURNING name, primary_color, header_image, questions, updated_at`,
    [config.name, config.primaryColor, config.headerImage, JSON.stringify(config.questions)]
  );

  const row = result.rows[0];

  return {
    name: row.name,
    primaryColor: row.primary_color,
    headerImage: row.header_image,
    questions: normalizeSurveyConfig({ questions: row.questions }).questions,
    updatedAt: row.updated_at.toISOString()
  } satisfies SurveyConfig;
}

function formatOtherAnswer(value: unknown) {
  const otherText = normalizeText(value, "", 500);
  return otherText ? `${otherPrefix} ${otherText}` : "";
}

function validateSingleAnswer(question: SurveyQuestion, value: unknown) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const answer = source ? asString(source.choice).trim() : asString(value).trim();

  if (!answer) {
    return question.required ? null : "";
  }

  if (answer === "__other__") {
    const otherAnswer = question.allowOther ? formatOtherAnswer(source?.otherText) : "";
    return otherAnswer || null;
  }

  return question.options.includes(answer) ? answer : null;
}

function validateMultipleAnswer(question: SurveyQuestion, value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const rawAnswers = source && Array.isArray(source.choices) ? source.choices : Array.isArray(value) ? value : [];
  const answers = Array.from(new Set(rawAnswers.map((answer) => asString(answer).trim()).filter(Boolean)));
  const selectedOptions = answers.filter((answer) => question.options.includes(answer));
  const hasInvalidOption = selectedOptions.length !== answers.length;
  const otherAnswer =
    question.allowOther && Boolean(source?.otherSelected) ? formatOtherAnswer(source?.otherText) : "";
  const finalAnswers = otherAnswer ? [...selectedOptions, otherAnswer] : selectedOptions;

  if (finalAnswers.length === 0) {
    return question.required ? null : [];
  }

  if (hasInvalidOption) {
    return null;
  }

  return finalAnswers;
}

function validateTextAnswer(question: SurveyQuestion, value: unknown) {
  const answer = asString(value).trim().slice(0, 2000);

  if (!answer && question.required) {
    return null;
  }

  return answer;
}

export function validateAnswers(config: SurveyConfig, input: unknown) {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const answers: StoredAnswer[] = [];
  const errors: Record<string, string> = {};

  for (const question of config.questions) {
    const rawAnswer = source[question.id];
    const value =
      question.type === "single"
        ? validateSingleAnswer(question, rawAnswer)
        : question.type === "multiple"
          ? validateMultipleAnswer(question, rawAnswer)
          : validateTextAnswer(question, rawAnswer);

    if (value === null) {
      errors[question.id] = question.required ? "This question is required." : "Invalid answer.";
      continue;
    }

    answers.push({
      questionId: question.id,
      title: question.title,
      type: question.type,
      required: question.required,
      value
    });
  }

  return {
    answers,
    errors
  };
}

export async function saveSurveyResponse(rawAnswers: unknown) {
  const config = await getSurveyConfig();
  const validation = validateAnswers(config, rawAnswers);

  if (Object.keys(validation.errors).length > 0) {
    return {
      ok: false as const,
      errors: validation.errors
    };
  }

  const id = randomUUID();

  await query(
    "INSERT INTO survey_responses (id, survey_name, answers) VALUES ($1, $2, $3::jsonb)",
    [id, config.name, JSON.stringify(validation.answers)]
  );

  return {
    ok: true as const,
    id
  };
}

function normalizeStoredAnswers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((answer) => {
    if (!answer || typeof answer !== "object") {
      return [];
    }

    const source = answer as Record<string, unknown>;
    const type = normalizeType(source.type);
    const rawValue = type === "multiple" && Array.isArray(source.value) ? source.value : source.value;

    return [
      {
        questionId: normalizeText(source.questionId, "", 80),
        title: normalizeText(source.title, "Untitled question", 300) || "Untitled question",
        type,
        required: Boolean(source.required),
        value:
          type === "multiple"
            ? (Array.isArray(rawValue) ? rawValue.map((item) => normalizeText(item, "", 600)).filter(Boolean) : [])
            : normalizeText(rawValue, "", 2000)
      }
    ] satisfies StoredAnswer[];
  });
}

export async function getSurveyResponses(limit?: number) {
  const params: unknown[] = [];
  let sql = "SELECT id, survey_name, answers, created_at FROM survey_responses ORDER BY created_at DESC";

  if (limit) {
    params.push(limit);
    sql += " LIMIT $1";
  }

  const result = await query<SurveyResponseRow>(sql, params);

  return result.rows.map((row) => ({
    id: row.id,
    surveyName: row.survey_name,
    answers: normalizeStoredAnswers(row.answers),
    createdAt: row.created_at.toISOString()
  }));
}

export async function getSurveyResponseCount() {
  const result = await query<{ count: string }>("SELECT count(*) FROM survey_responses");
  return Number(result.rows[0]?.count || 0);
}
