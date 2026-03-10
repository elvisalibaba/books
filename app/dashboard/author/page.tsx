import Link from "next/link";
import { BookOpen, CircleDollarSign, Library, PlusCircle, Sparkles, TrendingUp, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Types manuels basés sur les sélections
type Book = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  price: number;
};

type OrderItem = {
  price: number;
  books: { author_id: string } | { author_id: string }[] | null;
  orders: { payment_status: string } | { payment_status: string }[] | null;
};

type Acquisition = {
  user_id: string;
  purchased_at: string;
  books: { id: string; title: string; price: number; author_id: string } | { id: string; title: string; price: number; author_id: string }[] | null;
  profiles: { name: string | null; email: string } | { name: string | null; email: string }[] | null;
};

export default async function AuthorDashboardPage() {
  const profile = await requireRole(["author"]);
  const supabase = await createClient();

  // ✅ Cast des résultats avec les types manuels
  const [{ data: books }, { data: orderItems }, { data: acquisitions }] = (await Promise.all([
    supabase
      .from("books")
      .select("id, title, status, created_at, price")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_items")
      .select("price, books:book_id(author_id), orders:order_id(payment_status)")
      .order("id", { ascending: false }),
    supabase
      .from("library")
      .select("user_id, purchased_at, books:book_id(id, title, price, author_id), profiles:user_id(name, email)")
      .order("purchased_at", { ascending: false }),
  ])) as [
    { data: Book[] | null },
    { data: OrderItem[] | null },
    { data: Acquisition[] | null }
  ];

  const ownPaidSales =
    orderItems?.filter((item) => {
      const book = Array.isArray(item.books) ? item.books[0] : item.books;
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      return book?.author_id === profile.id && order?.payment_status === "paid";
    }) ?? [];

  const ownAcquisitions =
    acquisitions?.filter((item) => {
      const book = Array.isArray(item.books) ? item.books[0] : item.books;
      return book?.author_id === profile.id;
    }) ?? [];

  const totalBooks = books?.length ?? 0;
  const publishedBooks = books?.filter((book) => book.status === "published").length ?? 0;
  const draftBooks = books?.filter((book) => book.status === "draft").length ?? 0;
  const totalRevenue = ownPaidSales.reduce((sum, item) => sum + item.price, 0);
  const recentBooks = books?.slice(0, 4) ?? [];
  const uniqueReaders = new Set(ownAcquisitions.map((item) => item.user_id)).size;
  const freeClaims = ownAcquisitions.filter((item) => {
    const book = Array.isArray(item.books) ? item.books[0] : item.books;
    return (book?.price ?? 0) <= 0;
  }).length;
  const recentReaders = ownAcquisitions.slice(0, 5);

  return (
    <section className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-red-600 via-rose-600 to-orange-500 p-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Author Studio
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Tableau de bord auteur</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
            Bienvenue, {profile.name ?? profile.email}. Suivez vos performances, vos lecteurs et toutes les acquisitions, meme sur les livres gratuits.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/author/add-book"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:bg-red-50"
            >
              <PlusCircle className="h-4 w-4" />
              Ajouter un livre
            </Link>
            <Link
              href="/dashboard/author/books"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <Library className="h-4 w-4" />
              Voir le catalogue
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <BookOpen className="h-4 w-4 text-red-500" />
            Livres
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalBooks}</p>
          <p className="mt-1 text-sm text-slate-500">Dans votre catalogue</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Publies
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{publishedBooks}</p>
          <p className="mt-1 text-sm text-slate-500">Disponibles en vente</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Brouillons
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{draftBooks}</p>
          <p className="mt-1 text-sm text-slate-500">A finaliser</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CircleDollarSign className="h-4 w-4 text-red-500" />
            Revenus
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-500">Commandes payees</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Users className="h-4 w-4 text-sky-500" />
            Lecteurs
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{uniqueReaders}</p>
          <p className="mt-1 text-sm text-slate-500">Ont acquis vos livres</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Derniers lecteurs</h2>
            <Link href="/dashboard/author/sales" className="text-sm font-semibold text-red-600 hover:text-red-700">
              Voir toutes les ventes
            </Link>
          </div>

          <div className="space-y-3">
            {recentReaders.length > 0 ? (
              recentReaders.map((entry, index) => {
                const book = Array.isArray(entry.books) ? entry.books[0] : entry.books;
                const buyer = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
                const isFree = (book?.price ?? 0) <= 0;

                return (
                  <article key={`${entry.user_id}-${entry.purchased_at}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{buyer?.name ?? "Lecteur"} <span className="font-normal text-slate-500">({buyer?.email ?? "email indisponible"})</span></p>
                      <p className="text-sm text-slate-600">{book?.title ?? "Livre supprime"}</p>
                      <p className="text-xs text-slate-500">Ajout le {new Date(entry.purchased_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isFree ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {isFree ? "Gratuit" : "Payant"}
                    </span>
                  </article>
                );
              })
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Aucun lecteur visible pour le moment.</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Acquisitions</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-900">Acquisitions totales</p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">{ownAcquisitions.length}</p>
                <p className="mt-1 text-sm text-emerald-800">Gratuites et payantes confondues</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">Lectures gratuites</p>
                <p className="mt-2 text-3xl font-bold text-amber-950">{freeClaims}</p>
                <p className="mt-1 text-sm text-amber-800">Utiles pour mesurer l attrait de vos titres offerts</p>
              </div>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Derniers livres</h2>
              <Link href="/dashboard/author/books" className="text-sm font-semibold text-red-600 hover:text-red-700">
                Tout voir
              </Link>
            </div>

            <div className="space-y-3">
              {recentBooks.length > 0 ? (
                recentBooks.map((book) => (
                  <article key={book.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{book.title}</p>
                      <p className="text-xs text-slate-500">Cree le {new Date(book.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        book.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {book.status === "published" ? "Publie" : "Brouillon"}
                    </span>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Aucun livre ajoute pour le moment.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}
