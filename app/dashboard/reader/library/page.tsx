import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Gem, LibraryBig, Sparkles, Star } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Types manuels basés sur la sélection
type BookInfo = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  categories: string[] | null;
  rating_avg: number | null;
};

type LibraryItem = {
  book_id: string;
  purchased_at: string;
  books: BookInfo | BookInfo[] | null; // Peut être un objet ou un tableau selon la cardinalité
};

export default async function ReaderLibraryPage() {
  const profile = await requireRole(["reader"]);
  const supabase = await createClient();

  const { data: library } = (await supabase
    .from("library")
    .select("book_id, purchased_at, books:book_id(id, title, description, cover_url, price, categories, rating_avg)")
    .order("purchased_at", { ascending: false })) as { data: LibraryItem[] | null };

  const items = library ?? [];
  const totalBooks = items.length;
  const freeBooks = items.filter((item) => {
    const book = Array.isArray(item.books) ? item.books[0] : item.books;
    return (book?.price ?? 0) <= 0;
  }).length;
  const paidBooks = totalBooks - freeBooks;
  const avgRatingSource = items
    .map((item) => {
      const book = Array.isArray(item.books) ? item.books[0] : item.books;
      return book?.rating_avg ?? null;
    })
    .filter((rating): rating is number => rating !== null);
  const avgRating = avgRatingSource.length
    ? avgRatingSource.reduce((sum, rating) => sum + rating, 0) / avgRatingSource.length
    : null;

  return (
    <section className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_28%),linear-gradient(135deg,_#022c22_0%,_#0f172a_48%,_#164e63_100%)] p-7 text-white shadow-xl">
        <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute right-10 top-0 h-48 w-48 rounded-full bg-sky-300/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              Personal Library
            </p>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Une bibliotheque lecteur plus soignee, plus claire, plus vivante.</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
              {profile.name ?? profile.email}, retrouve ici tous tes titres, qu ils soient gratuits ou payants, dans un espace construit pour la reprise de lecture.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/books"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                <Compass className="h-4 w-4" />
                Explorer la librairie
              </Link>
              <Link
                href="/dashboard/reader/purchases"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Voir les acquisitions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Collection active</p>
              <p className="mt-2 text-3xl font-bold text-white">{totalBooks}</p>
              <p className="mt-1 text-sm text-slate-300">titres disponibles tout de suite dans ton espace.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Gratuits</p>
                <p className="mt-2 text-xl font-semibold text-white">{freeBooks}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Payants</p>
                <p className="mt-2 text-xl font-semibold text-white">{paidBooks}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <LibraryBig className="h-4 w-4 text-emerald-500" />
            Bibliotheque
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalBooks}</p>
          <p className="mt-1 text-sm text-slate-500">Livres deja debloques</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Gem className="h-4 w-4 text-amber-500" />
            Acces gratuits
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{freeBooks}</p>
          <p className="mt-1 text-sm text-slate-500">Titres recuperes sans paiement</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <BookOpen className="h-4 w-4 text-sky-500" />
            Achats payants
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{paidBooks}</p>
          <p className="mt-1 text-sm text-slate-500">Titres achetes dans ton compte</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Star className="h-4 w-4 text-amber-500" />
            Note moyenne
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{avgRating ? avgRating.toFixed(1) : "--"}</p>
          <p className="mt-1 text-sm text-slate-500">Sur les livres notes de ta collection</p>
        </article>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Mes livres</h2>
            <p className="text-sm text-slate-500">Tous les titres acquis, gratuits et payants confondus.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{totalBooks} titres</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {items.length > 0 ? (
            items.map((item) => {
              const book = Array.isArray(item.books) ? item.books[0] : item.books;
              const isFree = (book?.price ?? 0) <= 0;

              return (
                <article
                  key={item.book_id}
                  className="group rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,1)_0%,_rgba(236,253,245,0.8)_100%)] p-5 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-md">
                      {(book?.title ?? "HB").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-semibold text-slate-900">{book?.title ?? "Titre indisponible"}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isFree ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {isFree ? "Gratuit" : "Payant"}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {book?.description ?? "Pret a etre relu quand tu veux."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Ajoute le {new Date(item.purchased_at).toLocaleDateString("fr-FR")}</span>
                        {book?.categories?.[0] ? <span>{book.categories[0]}</span> : null}
                        {book?.rating_avg ? <span>{book.rating_avg.toFixed(1)}/5</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">{isFree ? "Acces instantane" : `$${(book?.price ?? 0).toFixed(2)}`}</p>
                    <Link
                      href={`/book/${item.book_id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-emerald-700"
                    >
                      Ouvrir
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Aucun livre dans la bibliotheque pour le moment. Les titres gratuits et payants apparaîtront ici des qu ils seront acquis.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
