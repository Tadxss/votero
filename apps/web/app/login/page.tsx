"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignInWithOtp, useVerifyOtp } from "@repo/shared";
import { Button } from "../_components/Button";
import { inputClasses } from "../_components/styles";

export default function LoginPage() {
  const router = useRouter();
  const sendCode = useSignInWithOtp();
  const verifyCode = useVerifyOtp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");

  function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    sendCode.mutate({ email: email.trim() }, { onSuccess: () => setStep("code") });
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    verifyCode.mutate(
      { email: email.trim(), token: code.trim() },
      { onSuccess: () => router.push("/lobbies") },
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-700/20"
      />

      <div className="relative mx-auto flex max-w-sm flex-col gap-6">
        <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">Sign in</h1>

        <div className="flex animate-pop-in flex-col gap-6 rounded-3xl border border-neutral-200 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="flex flex-col gap-4">
              <p className="text-sm text-[var(--foreground-muted)]">
                We&apos;ll email you a 6-digit code — no password needed.
              </p>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClasses}
                />
              </label>
              {sendCode.isError && (
                <p className="text-sm font-medium text-red-600">{sendCode.error.message}</p>
              )}
              <Button type="submit" disabled={sendCode.isPending} className="w-full">
                {sendCode.isPending ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <p className="text-sm text-[var(--foreground-muted)]">
                Check <span className="font-semibold text-[var(--foreground)]">{email}</span> for
                your code.
              </p>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                6-digit code
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className={`${inputClasses} text-center tracking-[0.4em]`}
                />
              </label>
              {verifyCode.isError && (
                <p className="text-sm font-medium text-red-600">{verifyCode.error.message}</p>
              )}
              <Button type="submit" disabled={verifyCode.isPending} className="w-full">
                {verifyCode.isPending ? "Verifying…" : "Verify & sign in"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-sm font-medium text-[var(--foreground-muted)] hover:text-brand-600"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
