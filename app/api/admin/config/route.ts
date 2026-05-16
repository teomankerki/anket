import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { saveSurveyConfig } from "@/lib/survey";

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const config = await saveSurveyConfig(body);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save survey.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
