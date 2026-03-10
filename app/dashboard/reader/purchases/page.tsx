import Link from "next/link";
import { ArrowRight, CreditCard, Gem, Receipt, ShoppingBag, Sparkles, Wallet } from "lucide-react";
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
type BookBasic = {
  id: string;
  title: string;
  cover_url: string | null;
  categories: string[] | null;
};

type OrderItem = {
  price: number;
  books: BookBasic | BookBasic[] | null;
};

type Order = {
  id: string;
  total_price: number;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[] | null;
};

type BookWithPrice = BookBasic & { price: number };

type LibraryItem = {
  book_id: string;
  purchased_at: string;
  books: BookWithPrice | BookWithPrice[] | null;
};

export default async function ReaderPurchasesPage() {
  await requireRole(["reader"]);
  const supabase = await createClient();

  const [{ data: orders }, { data: library }] = (await Promise.all([
    supabase
      .from("orders")
      .select("id, total_price, payment_status, created_at, order_items(price, books:book_id(id, title, cover_url, categories))")
      .order("created_at", { ascending: false }),
    supabase
      .from("library")
      .select("book_id, purchased_at, books:book_id(id, title, price, cover_url, categories)")
      .order("purchased_at", { ascending: false }),
  ])) as [{ data: Order[] | null }, { data: LibraryItem[] | null }];

  const paidOrders = (orders ?? []).filter((order) => order.payment_status === "paid");
  const totalSpent = paidOrders.reduce((sum, order) => sum + order.total_price, 0);
  const freeClaims = (library ?? []).filter((item) => {
    const book = Array.isArray(item.books) ? item.books[0] : item.books;
    return (book?.price ?? 0) <= 0;
  });

  const timeline = [
    ...paidOrders.map((order) => ({
      kind: "paid" as const,
      id: order.id,
      date: order.created_at,
      label: `Commande ${order.id.slice(0, 8)}`,
      amount: order.total_price,
      status: order.payment_status,
      titles:
        order.order_items?.map((item) => {
          const book = Array.isArray(item.books) ? item.books[0] : item.books;
          return book?.title ?? "Livre";
        }) ?? [],
    })),
    ...freeClaims.map((item) => {
      const book = Array.isArray(item.books) ? item.books[0] : item.books;
      return {
        kind: "free" as const,
        id: item.book_id,
        date: item.purchased_at,
        label: book?.title ?? "Livre gratuit",
        amount: 0,
        status: "free",
        titles: [book?.title ?? "Livre gratuit"],
      };
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.25),_transparent_30%),linear-gradient(135deg,_#111827_0%,_#1d4ed8_42%,_#0f766e_100%)] p-7 text-white shadow-xl">
        <div className="absolute -left-8 top-16 h-44 w-44 rounded-full bg-sky-300/15 blur-3xl" />
        <div className="absolute right-0 top-4 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.95fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
              <Sparkles className="h-3.5 w-3.5" />
              Purchase Feed
            </p>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Toutes tes acquisitions au meme endroit.</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
              Les achats payants et les livres gratuits debloques remontent ici dans une timeline unique, plus simple a suivre.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/reader/library"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-sky-50"
              >
                <ShoppingBag className="h-4 w-4" />
                Ouvrir ma bibliotheque
              </Link>
              <Link
                href="/books"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Continuer mes decouvertes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Total investi</p>
              <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(totalSpent)}</p>
              <p className="mt-1 text-sm text-slate-300">Sur les commandes reglees.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Commandes payees</p>
                <p className="mt-2 text-xl font-semibold text-white">{paidOrders.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Livres gratuits</p>
                <p className="mt-2 text-xl font-semibold text-white">{freeClaims.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Receipt className="h-4 w-4 text-sky-500" />
            Historique total
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{timeline.length}</p>
          <p className="mt-1 text-sm text-slate-500">Evenements d acquisition</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            Payees
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{paidOrders.length}</p>
          <p className="mt-1 text-sm text-slate-500">Commandes confirmees</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Wallet className="h-4 w-4 text-amber-500" />
            Budget lecture
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
          <p className="mt-1 text-sm text-slate-500">Montant depense</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Gem className="h-4 w-4 text-emerald-500" />
            Deblocages gratuits
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{freeClaims.length}</p>
          <p className="mt-1 text-sm text-slate-500">Titres sans paiement</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Timeline des acquisitions</h2>
              <p className="text-sm text-slate-500">Livres gratuits et commandes payantes affiches dans le meme flux.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{timeline.length} evenements</span>
          </div>

          <div className="space-y-3">
            {timeline.length > 0 ? (
              timeline.map((entry) => (
                <article
                  key={`${entry.kind}-${entry.id}`}
                  className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,1)_0%,_rgba(239,246,255,0.9)_100%)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{entry.label}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            entry.kind === "free" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {entry.kind === "free" ? "Gratuit" : "Payant"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{new Date(entry.date).toLocaleDateString("fr-FR")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.titles.map((title) => (
                          <span key={`${entry.id}-${title}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(entry.amount)}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{entry.status}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Aucun achat ou debocage gratuit pour le moment.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Focus gratuit</h2>
            <div className="mt-4 space-y-3">
              {freeClaims.length > 0 ? (
                freeClaims.slice(0, 4).map((item) => {
                  const book = Array.isArray(item.books) ? item.books[0] : item.books;
                  return (
                    <article key={item.book_id} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="font-semibold text-emerald-900">{book?.title ?? "Livre gratuit"}</p>
                      <p className="mt-1 text-sm text-emerald-700">
                        Debloque le {new Date(item.purchased_at).toLocaleDateString("fr-FR")}
                      </p>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Aucun livre gratuit debloque pour le moment.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Vue moderne</p>
            <h2 className="mt-3 text-2xl font-semibold">Chaque acquisition compte.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Qu un livre soit gratuit ou payant, il remonte ici pour que ton dashboard raconte toute ton activite de lecture.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
