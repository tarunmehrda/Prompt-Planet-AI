"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Leaf, Loader2, Droplets, Zap, Cloud } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";

interface Props {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: Props) {
  const { user, loading, login, signup } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, don't linger on the auth screen.
  useEffect(() => {
    if (!loading && user) router.replace("/calculator");
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result =
      mode === "login"
        ? await login(email, password)
        : await signup(name, email, password);
    setSubmitting(false);
    if (result.ok) {
      router.push("/calculator");
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      {/* Decorative side */}
      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-surface via-ink-2 to-ink p-10">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-water/20 blur-3xl" />
          <div className="relative">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-water shadow-glow-brand">
              <Leaf className="h-6 w-6 text-ink" strokeWidth={2.4} />
            </span>
            <h2 className="mt-8 text-3xl font-bold leading-tight">
              Every prompt has a
              <br />
              <span className="text-gradient">footprint.</span>
            </h2>
            <p className="mt-4 max-w-sm text-mist">
              Join Prompt Planet to see the water, energy and carbon behind your AI use — in
              living 3D — and watch it shrink over time.
            </p>
            <div className="mt-10 space-y-4">
              {[
                { icon: Droplets, tint: "text-water", text: "Visualise water drop by drop" },
                { icon: Zap, tint: "text-energy", text: "Track energy in real time" },
                { icon: Cloud, tint: "text-carbon", text: "Understand your carbon" },
              ].map((r) => (
                <div key={r.text} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
                    <r.icon className={`h-4 w-4 ${r.tint}`} />
                  </span>
                  <span className="text-sm text-mist">{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl glass-strong p-8 sm:p-10">
          <h1 className="text-2xl font-bold">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-mist">
            {isLogin
              ? "Log in to continue tracking your footprint."
              : "It's free — your data stays on this server."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {!isLogin && (
              <Field
                label="Name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={isLogin ? "Your password" : "At least 6 characters"}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isLogin ? "Logging in…" : "Creating account…"}
                </>
              ) : isLogin ? (
                "Log in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-mist">
            {isLogin ? "New here? " : "Already have an account? "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="font-medium text-brand hover:underline"
            >
              {isLogin ? "Create an account" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

function Field({ label, type, value, onChange, placeholder, autoComplete }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-mist">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-mist-2 focus:border-brand/60 focus:bg-white/[0.06]"
      />
    </label>
  );
}
