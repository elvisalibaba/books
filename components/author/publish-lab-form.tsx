"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("reader");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // ✅ Correction : forcer le type avec `as any`
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        name,
        role,
      } as any);
    }

    setLoading(false);

    // If email confirmation is enabled in Supabase, session can be null after sign-up.
    if (!data.session) {
      setSuccess("Compte cree. Verifie ton email puis connecte-toi.");
      router.push("/login");
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="ios-surface-strong space-y-4 rounded-[2rem] p-6">
      <div className="space-y-2">
        <p className="ios-kicker">Inscription</p>
        <h1 className="ios-title text-2xl font-bold">Creez votre compte</h1>
      </div>
      <input
        type="text"
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="ios-input w-full rounded-2xl px-4 py-3"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="ios-input w-full rounded-2xl px-4 py-3"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="ios-input w-full rounded-2xl px-4 py-3"
        required
      />
      <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="ios-input w-full rounded-2xl px-4 py-3">
        <option value="reader">Lecteur</option>
        <option value="author">Auteur</option>
      </select>
      {error && <p className="ios-danger rounded-2xl px-4 py-3 text-sm">{error}</p>}
      {success && <p className="ios-success rounded-2xl px-4 py-3 text-sm">{success}</p>}
      <button disabled={loading} className="ios-button-primary w-full rounded-2xl px-4 py-3 font-semibold disabled:opacity-60">
        {loading ? "Creation..." : "S'inscrire"}
      </button>
    </form>
  );
}
