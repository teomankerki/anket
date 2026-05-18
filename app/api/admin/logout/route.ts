import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  await clearAdminSession(request);
  return NextResponse.json({ ok: true });
}
