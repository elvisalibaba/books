import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Définition manuelle du type basé sur la sélection
type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
};

export default async function AdminUsersPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  // ✅ Caster le résultat avec le type local
  const { data } = (await supabase
    .from("profiles")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: false })) as { data: UserRow[] | null };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">All users</h1>
      <div className="space-y-2">
        {data?.map((user) => (
          <article key={user.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-medium">{user.name ?? "Unnamed user"}</p>
            <p className="text-sm text-slate-600">{user.email}</p>
            <p className="text-sm text-slate-600">Role: {user.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
