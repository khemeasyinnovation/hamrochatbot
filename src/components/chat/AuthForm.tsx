"use client";

import { useState } from "react";
import { ApiUser, login, signup } from "@/lib/chatApi";

export function AuthForm({ onAuthed }: { onAuthed: (user: ApiUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "login") {
        const user = await login(email, password);
        onAuthed(user as ApiUser);
        return;
      }

      const result = await signup(email, password);
      if ("needsConfirmation" in result) {
        setInfo(`Check ${result.email} for a confirmation link, then log in below.`);
        setMode("login");
        return;
      }
      onAuthed(result);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <p className="text-center font-semibold text-[#0b2545] text-sm mb-2">
          {mode === "login" ? "Log in to chat" : "Create an account"}
        </p>

        {info && <p className="text-xs text-slate-500 text-center">{info}</p>}

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
        />

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2 rounded-lg bg-[#0b2545] text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setInfo("");
          }}
          className="w-full text-xs text-slate-500 hover:text-[#0b2545]"
        >
          {mode === "login" ? "No account? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}