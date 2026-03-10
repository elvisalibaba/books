import Link from "next/link";
import { BookOpen, LibraryBig, Receipt, Sparkles, Star, Clock3, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

// Types manuels basés sur les sélections
type BookInfo = {
  id: string;
  title: string;
  categories: string[] | null;
  cover_url: string | null;
  rating_avg: number | null;
};

type LibraryItem = {
  book_id: string;
  purchased_at: string;
  books: BookInfo | BookInfo[] | null;
};

type Order = {
  id: string;
  total_price: number;
  payment_status: string;
  created_at: string;
};

export default async function ReaderDashboardPage() {
  const profile = await requireRole(["reader"]);
  const supabase = await createClient();

  const [{ data: library }, { data: orders }] = (await Promise.all([
    supabase
      .from("library")
      .select("book_id, purchased_at, books:book_id(id, title, categories, cover_url, rating_avg)")
      .order("purchased_at", { ascending: false }),
    supabase.from("orders").select("id, total_price, payment_status, created_at").order("created_at", { ascending: false }),
  ])) as [{ data: LibraryItem[] | null }, { data: Order[] | null }];

  const totalBooks = library?.length ?? 0;
  const paidOrders = orders?.filter((order) => order.payment_status === "paid") ?? [];
  const totalSpent = paidOrders.reduce((sum, order) => sum + order.total_price, 0);
  const averageTicket = paidOrders.length > 0 ? totalSpent / paidOrders.length : 0;
  const recentBooks = library?.slice(0, 3) ?? [];

  const categoryCounts = new Map<string, number>();
  for (const item of library ?? []) {
    const book = Array.isArray(item.books) ? item.books[0] : item.books;
    for (const category of book?.categories ?? []) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  const favoriteCategory =
    [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "A explorer";
  const lastPurchaseDate = library?.[0]?.purchased_at
    ? new Date(library[0].purchased_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Aucun achat pour le moment";

  return (
    <section className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.35),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_40%,_#134e4a_100%)] p-7 text-white shadow-xl">
        <div className="absolute -right-10 top-8 h-48 w-48 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute left-10 top-24 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="absolute bottom-0 right-0 h-44 w-44 translate-x-12 translate-y-12 rounded-full border border-white/10" />

        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Reading Lounge
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
              Reader dashboard pense comme une bibliotheque premium.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
              Bienvenue, {profile.name ?? profile.email}. Retrouve tes lectures, suis tes achats et replonge vite dans ton univers.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/reader/library"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-amber-50"
              >
                <LibraryBig className="h-4 w-4" />
                Ouvrir ma bibliotheque
              </Link>
              <Link
                href="/dashboard/reader/purchases"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <Receipt className="h-4 w-4" />
                Voir mes achats
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Dernier achat</p>
              <p className="mt-2 text-lg font-semibold text-white">{lastPurchaseDate}</p>
              <p className="mt-1 text-sm text-slate-300">Une bibliotheque qui continue de grandir.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Categorie forte</p>
                <p className="mt-2 text-xl font-semibold text-white">{favoriteCategory}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Panier moyen</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(averageTicket)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <BookOpen className="h-4 w-4 text-amber-500" />
            Livres debloques
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalBooks}</p>
          <p className="mt-1 text-sm text-slate-500">Dans ta bibliotheque personnelle</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Receipt className="h-4 w-4 text-emerald-500" />
            Commandes payees
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{paidOrders.length}</p>
          <p className="mt-1 text-sm text-slate-500">Transactions validees</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Star className="h-4 w-4 text-amber-500" />
            Budget lecture
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
          <p className="mt-1 text-sm text-slate-500">Investi dans tes achats</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Clock3 className="h-4 w-4 text-sky-500" />
            Derniere activite
          </p>
          <p className="mt-3 text-xl font-bold text-slate-900">{lastPurchaseDate}</p>
          <p className="mt-1 text-sm text-slate-500">Dernier ajout a ta collection</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Reprendre la lecture</h2>
              <p className="text-sm text-slate-500">Tes acquisitions recentes, prêtes a etre rouvertes.</p>
            </div>
            <Link href="/dashboard/reader/library" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Tout voir
            </Link>
          </div>

          <div className="grid gap-3">
            {recentBooks.length > 0 ? (
              recentBooks.map((item, index) => {
                const book = Array.isArray(item.books) ? item.books[0] : item.books;

                return (
                  <article
                    key={item.book_id}
                    className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(135deg,_rgba(240,253,250,1)_0%,_rgba(255,251,235,0.9)_100%)] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-md">
                      {(book?.title ?? "HB").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Lecture {index + 1}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{book?.title ?? "Titre indisponible"}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-600">
                        <span>Achete le {new Date(item.purchased_at).toLocaleDateString("fr-FR")}</span>
                        {book?.rating_avg ? <span>Note {book.rating_avg.toFixed(1)}/5</span> : null}
                      </div>
                    </div>
                    <Link
                      href="/dashboard/reader/library"
                      className="inline-flex items-center gap-2 self-start rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:self-center"
                    >
                      Lire
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Ta bibliotheque est encore vide. Tes prochains achats apparaitront ici.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Actions rapides</h2>
            <div className="mt-4 grid gap-3">
              <Link
                href="/books"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Decouvrir de nouveaux livres
              </Link>
              <Link
                href="/dashboard/reader/library"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Gerer ma bibliotheque
              </Link>
              <Link
                href="/dashboard/reader/purchases"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Revoir mes commandes
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Mood de lecture</p>
            <h2 className="mt-3 text-2xl font-semibold">Collection en progression constante.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {totalBooks > 0
                ? `Tu as deja ${totalBooks} livre${totalBooks > 1 ? "s" : ""} disponible${totalBooks > 1 ? "s" : ""}. Continue sur ce rythme pour construire une vraie bibliotheque digitale.`
                : "Commence avec un premier achat pour activer une experience lecteur plus riche."}
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
