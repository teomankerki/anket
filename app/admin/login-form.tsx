"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "Invalid password.");
      return;
    }

    router.refresh();
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submitLogin}>
        <div className="login-mark" aria-hidden="true">
          <LockKeyhole size={24} strokeWidth={2} />
        </div>
        <h1>Admin</h1>
        <label>
          Password
          <input
            autoComplete="current-password"
            autoFocus
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
