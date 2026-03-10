import Link from "next/link";
import { CircleDollarSign, CreditCard, Library, ShoppingCart, Sparkles, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Types manuels basés sur la sélection
type OrderItemSales = {
  price: number;
  books: { title: string; author_id: string } | { title: string; author_id: string }[] | null;
  orders: { created_at: string; payment_status: string } | { created_at: string; payment_status: string }[] | null;
};

export default async function AuthorSalesPage() {
  const profile = await requireRole(["author"]);
  const supabase = await createClient();

  const { data } = (await supabase
    .from("order_items")
    .select("price, books:book_id(title, author_id), orders:order_id(created_at, payment_status)")
    .order("id", { ascending: false })) as { data: OrderItemSales[] | null };

  const ownSales =
    data?.filter((item) => {
      const book = Array.isArray(item.books) ? item.books[0] : item.books;
      return book?.author_id === profile.id;
    }) ?? [];

  const paidSales = ownSales.filter((sale) => {
    const order = Array.isArray(sale.orders) ? sale.orders[0] : sale.orders;
    return order?.payment_status === "paid";
  });

  const totalRevenue = paidSales.reduce((sum, item) => sum + item.price, 0);
  const totalOrders = ownSales.length;
  const paidOrders = paidSales.length;
  const pendingOrders = totalOrders - paidOrders;

  return (
    <section className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Sales Analytics
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Ventes auteur</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
            Suivez vos revenus et l etat des commandes sur vos livres publies.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/author/books"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <Library className="h-4 w-4" />
              Retour au catalogue
            </Link>
            <Link
              href="/dashboard/author/add-book"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <ShoppingCart className="h-4 w-4" />
              Ajouter un livre
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CircleDollarSign className="h-4 w-4 text-emerald-600" />
            Revenu total
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-slate-500">Commandes payees</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ShoppingCart className="h-4 w-4 text-cyan-600" />
            Commandes
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalOrders}</p>
          <p className="mt-1 text-sm text-slate-500">Toutes ventes</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            Payees
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{paidOrders}</p>
          <p className="mt-1 text-sm text-slate-500">Transactions valides</p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            En attente
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{pendingOrders}</p>
          <p className="mt-1 text-sm text-slate-500">A confirmer</p>
        </article>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Historique des ventes</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{totalOrders} lignes</span>
        </div>

        <div className="space-y-3">
          {ownSales.length > 0 ? (
            ownSales.map((sale, i) => {
              const book = Array.isArray(sale.books) ? sale.books[0] : sale.books;
              const order = Array.isArray(sale.orders) ? sale.orders[0] : sale.orders;
              const isPaid = order?.payment_status === "paid";

              return (
                <article key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{book?.title ?? "Livre supprime"}</p>
                    <p className="text-xs text-slate-500">
                      {order?.created_at ? new Date(order.created_at).toLocaleDateString() : "Date inconnue"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-slate-900">${sale.price.toFixed(2)}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {order?.payment_status ?? "unknown"}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Aucune vente enregistree pour le moment.</p>
          )}
        </div>
      </section>
    </section>
  );
}
