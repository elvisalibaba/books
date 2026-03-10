import Link from "next/link";
import { BookOpen, CircleDollarSign, Library, PlusCircle, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Définition manuelle des types basés sur la sélection
type BookFormatRow = {
  id: string;
  format: string;
  price: number;
  is_published: boolean;
};

type BookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  categories: string[];     // ARRAY dans le schéma
  language: string;
  book_formats: BookFormatRow[] | null;
};

export default async function AuthorBooksPage() {
  const profile = await requireRole(["author"]);
  const supabase = await createClient();

  // ✅ Caster la réponse avec le type BookRow[]
  const { data } = (await supabase
    .from("books")
    .select(
      "id, title, subtitle, status, created_at, updated_at, categories, language, book_formats(id, format, price, is_published)"
    )
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })) as { data: BookRow[] | null };

  const books = data ?? [];
  const publishedCount = books.filter((book) => book.status === "published").length;
  const draftCount = books.filter((book) => book.status === "draft").length;
  const totalFormats = books.reduce((sum, book) => sum + (book.book_formats?.length ?? 0), 0);

  return (
    <section className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Library className="h-3.5 w-3.5" />
            Catalogue auteur
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Gerez vos livres</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
            Vue complete de vos titres, formats et statuts de publication pour agir rapidement.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/author/add-book"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <PlusCircle className="h-4 w-4" />
              Ajouter un livre
            </Link>
            <Link
              href="/dashboard/author/sales"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <CircleDollarSign className="h-4 w-4" />
              Voir les ventes
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <BookOpen className="h-4 w-4 text-red-500" />
            Total livres
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{books.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Publies
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{publishedCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Brouillons
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{draftCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Library className="h-4 w-4 text-slate-700" />
            Formats
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalFormats}</p>
        </article>
      </div>

      <div className="space-y-4">
        {books.length > 0 ? (
          books.map((book) => (
            <article key={book.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{book.title}</h2>
                  {book.subtitle && <p className="mt-1 text-sm text-slate-500">{book.subtitle}</p>}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    book.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {book.status === "published" ? "Publie" : "Brouillon"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Langue: <span className="font-medium text-slate-900">{book.language}</span>
                </p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Categories: <span className="font-medium text-slate-900">
                    {book.categories.length ? book.categories.join(", ") : "Aucune"}
                  </span>
                </p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Cree: <span className="font-medium text-slate-900">{new Date(book.created_at).toLocaleDateString()}</span>
                </p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Maj: <span className="font-medium text-slate-900">{new Date(book.updated_at).toLocaleDateString()}</span>
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formats</p>
                <p className="mt-2 text-sm text-slate-700">
                  {(book.book_formats ?? [])
                    .map((fmt) => `${fmt.format} ($${fmt.price.toFixed(2)})${fmt.is_published ? "" : " [brouillon]"}`)
                    .join(" | ") || "Aucun format"}
                </p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <p className="text-slate-700">Aucun livre dans votre catalogue pour le moment.</p>
            <Link
              href="/dashboard/author/add-book"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <PlusCircle className="h-4 w-4" />
              Creer votre premier livre
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
