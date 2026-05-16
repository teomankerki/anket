import { NextResponse } from "next/server";
import { saveSurveyResponse } from "@/lib/survey";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { answers?: unknown };
    const result = await saveSurveyResponse(body.answers);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save response.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
