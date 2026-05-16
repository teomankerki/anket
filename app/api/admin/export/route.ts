import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getSurveyResponses } from "@/lib/survey";

function formatAnswer(value: string | string[]) {
  return Array.isArray(value) ? value.join(", ") : value;
}

function getQuestionColumns(responses: Awaited<ReturnType<typeof getSurveyResponses>>) {
  const seen = new Set<string>();
  const columns: { key: string; header: string }[] = [];

  for (const response of responses) {
    for (const answer of response.answers) {
      const key = answer.questionId || answer.title;

      if (!seen.has(key)) {
        seen.add(key);
        columns.push({
          key,
          header: answer.title || "Untitled question"
        });
      }
    }
  }

  return columns;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const responses = await getSurveyResponses();
  const questionColumns = getQuestionColumns(responses);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Responses");

  worksheet.columns = [
    { header: "Submitted at", key: "createdAt", width: 24 },
    { header: "Response ID", key: "id", width: 38 },
    { header: "Survey name", key: "surveyName", width: 28 },
    ...questionColumns.map((column) => ({ header: column.header, key: column.key, width: 32 }))
  ];

  for (const response of responses) {
    const row: Record<string, string> = {
      createdAt: response.createdAt,
      id: response.id,
      surveyName: response.surveyName
    };

    for (const answer of response.answers) {
      row[answer.questionId || answer.title] = formatAnswer(answer.value);
    }

    worksheet.addRow(row);
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `survey-responses-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Cache-Control": "no-store"
    }
  });
}
