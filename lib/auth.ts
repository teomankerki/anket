import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const cookieName = "anket_admin_session";
const maxAgeSeconds = 60 * 60 * 8;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;

  if (!secret) {
    throw new Error("AUTH_SECRET or ADMIN_PASSWORD is not configured.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function shouldUseSecureCookie(request?: Request) {
  if (process.env.AUTH_COOKIE_SECURE === "true") {
    return true;
  }

  if (process.env.AUTH_COOKIE_SECURE === "false") {
    return false;
  }

  const forwardedProto = request?.headers.get("x-forwarded-proto");

  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return process.env.NODE_ENV === "production";
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function verifyAdminPassword(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredPassword) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }

  return safeCompare(password, configuredPassword);
}

export async function createAdminSession(request?: Request) {
  const payload = JSON.stringify({
    issuedAt: Date.now(),
    nonce: randomBytes(16).toString("base64url")
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const value = `${encodedPayload}.${sign(encodedPayload)}`;
  const cookieStore = await cookies();

  cookieStore.set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    maxAge: maxAgeSeconds,
    path: "/"
  });
}

export async function clearAdminSession(request?: Request) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    maxAge: 0,
    path: "/"
  });
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(cookieName)?.value;

  if (!rawValue) {
    return false;
  }

  const [encodedPayload, signature] = rawValue.split(".");

  if (!encodedPayload || !signature || !safeCompare(sign(encodedPayload), signature)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      issuedAt?: number;
    };

    if (!payload.issuedAt) {
      return false;
    }

    return Date.now() - payload.issuedAt < maxAgeSeconds * 1000;
  } catch {
    return false;
  }
}
