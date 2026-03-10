"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BOOK_CATEGORIES } from "@/lib/book-categories";
import { createClient } from "@/lib/supabase/client";
import type { BookStatus } from "@/types/database";

type OptionalFormat = "paperback" | "hardcover" | "audiobook";

type FormatState = {
  enabled: boolean;
  price: string;
  stockQuantity: string;
  publish: boolean;
};

const initialOptionalFormat: FormatState = {
  enabled: false,
  price: "0",
  stockQuantity: "",
  publish: false,
};

function splitCsv(input: string) {
  return input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getFileFormat(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".epub")) return "epub";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".mobi")) return "mobi";
  return "unknown";
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const safe = normalized.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return safe.replace(/^-|-$/g, "") || "file";
}

export function PublishLabForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [authorFullName, setAuthorFullName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [isbn, setIsbn] = useState("");
  const [language, setLanguage] = useState("fr");
  const [publisher, setPublisher] = useState("Holistique Books");
  const [publicationDate, setPublicationDate] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [coAuthors, setCoAuthors] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tags, setTags] = useState("");
  const [ageRating, setAgeRating] = useState("Tout public");
  const [edition, setEdition] = useState("1ere edition");
  const [seriesName, setSeriesName] = useState("");
  const [seriesPosition, setSeriesPosition] = useState("");
  const [coverAltText, setCoverAltText] = useState("");
  const [samplePages, setSamplePages] = useState("");
  const [status, setStatus] = useState<BookStatus>("draft");

  const [ebookPrice, setEbookPrice] = useState("0");
  const [ebookDownloadable, setEbookDownloadable] = useState(false);
  const [ebookPublished, setEbookPublished] = useState(false);

  const [paperback, setPaperback] = useState<FormatState>(initialOptionalFormat);
  const [hardcover, setHardcover] = useState<FormatState>(initialOptionalFormat);
  const [audiobook, setAudiobook] = useState<FormatState>(initialOptionalFormat);

  const [cover, setCover] = useState<File | null>(null);
  const [ebookFile, setEbookFile] = useState<File | null>(null);
  const [sampleFile, setSampleFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidIsbn = useMemo(() => {
    const digits = isbn.replace(/[^0-9]/g, "");
    return isbn.length > 0 && digits.length !== 13;
  }, [isbn]);

  function toggleDefaultCategory(category: string) {
    setSelectedCategory((prev) => (prev === category ? "" : category));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cover || !ebookFile) {
      setError("Couverture et fichier ebook requis.");
      return;
    }
    if (!authorFullName.trim()) {
      setError("Nom complet de l'auteur requis.");
      return;
    }
    if (invalidIsbn) {
      setError("ISBN invalide: 13 chiffres requis.");
      return;
    }
    if (!selectedCategory) {
      setError("Sélectionne une catégorie principale pour ce livre.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("Session expirée. Reconnecte-toi.");
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: authorFullName.trim() } as any)
      .eq("id", authData.user.id);
    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    const now = Date.now();
    const safeCoverName = sanitizeFileName(cover.name);
    const safeEbookName = sanitizeFileName(ebookFile.name);
    const safeSampleName = sampleFile ? sanitizeFileName(sampleFile.name) : null;
    const coverPath = `covers/${authData.user.id}/${now}-${safeCoverName}`;
    const ebookPath = `files/${authData.user.id}/${now}-${safeEbookName}`;
    const samplePath = sampleFile && safeSampleName ? `files/${authData.user.id}/samples/${now}-${safeSampleName}` : null;

    const { error: coverError } = await supabase.storage.from("books").upload(coverPath, cover);
    if (coverError) {
      setError(coverError.message);
      setSaving(false);
      return;
    }

    const { error: ebookError } = await supabase.storage.from("books").upload(ebookPath, ebookFile);
    if (ebookError) {
      setError(ebookError.message);
      setSaving(false);
      return;
    }

    if (sampleFile && samplePath) {
      const { error: sampleError } = await supabase.storage.from("books").upload(samplePath, sampleFile);
      if (sampleError) {
        setError(sampleError.message);
        setSaving(false);
        return;
      }
    }

    const bookPayload = {
      title,
      subtitle: subtitle || null,
      description,
      author_id: authData.user.id,
      co_authors: splitCsv(coAuthors),
      isbn: isbn ? isbn.replace(/[^0-9]/g, "") : null,
      language,
      publisher: publisher || null,
      publication_date: publicationDate || null,
      page_count: pageCount ? Number(pageCount) : null,
      cover_url: coverPath,
      cover_thumbnail_url: coverPath,
      cover_alt_text: coverAltText || null,
      categories: [selectedCategory],
      tags: splitCsv(tags),
      age_rating: ageRating || null,
      edition: edition || null,
      series_name: seriesName || null,
      series_position: seriesPosition ? Number(seriesPosition) : null,
      file_url: ebookPath,
      file_format: getFileFormat(ebookFile.name),
      file_size: ebookFile.size,
      sample_url: samplePath,
      sample_pages: samplePages ? Number(samplePages) : null,
      price: Number(ebookPrice),
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    };

    const { data: insertedBook, error: bookError } = await supabase.from("books").insert(bookPayload).select("id").single();

    if (bookError || !insertedBook) {
      setError(bookError?.message ?? "Création du livre impossible.");
      setSaving(false);
      return;
    }

    const formatRows = [
      {
        book_id: insertedBook.id,
        format: "ebook" as const,
        price: Number(ebookPrice),
        file_url: ebookPath,
        stock_quantity: null,
        file_size_mb: Math.ceil(ebookFile.size / (1024 * 1024)),
        downloadable: ebookDownloadable,
        is_published: ebookPublished || status === "published",
      },
      ...(paperback.enabled
        ? [
            {
              book_id: insertedBook.id,
              format: "paperback" as const,
              price: Number(paperback.price),
              file_url: null,
              stock_quantity: paperback.stockQuantity ? Number(paperback.stockQuantity) : null,
              file_size_mb: null,
              downloadable: false,
              is_published: paperback.publish,
            },
          ]
        : []),
      ...(hardcover.enabled
        ? [
            {
              book_id: insertedBook.id,
              format: "hardcover" as const,
              price: Number(hardcover.price),
              file_url: null,
              stock_quantity: hardcover.stockQuantity ? Number(hardcover.stockQuantity) : null,
              file_size_mb: null,
              downloadable: false,
              is_published: hardcover.publish,
            },
          ]
        : []),
      ...(audiobook.enabled
        ? [
            {
              book_id: insertedBook.id,
              format: "audiobook" as const,
              price: Number(audiobook.price),
              file_url: null,
              stock_quantity: null,
              file_size_mb: null,
              downloadable: false,
              is_published: audiobook.publish,
            },
          ]
        : []),
    ];

    const { error: formatError } = await supabase.from("book_formats").insert(formatRows);
    if (formatError) {
      setError(formatError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/dashboard/author/books");
    router.refresh();
  }

  function renderOptionalFormat(
    label: string,
    state: FormatState,
    setter: React.Dispatch<React.SetStateAction<FormatState>>,
    type: OptionalFormat,
  ) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <label className="flex cursor-pointer items-center gap-3 text-base font-medium text-gray-800">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => setter((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="h-5 w-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500/20"
            />
            {label}
          </label>
        </div>
        {state.enabled && (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Prix ({type})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.price}
                  onChange={(e) => setter((prev) => ({ ...prev, price: e.target.value }))}
                  className="mt-1.5 block w-full rounded-xl border-0 bg-gray-100 px-4 py-2.5 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Stock (opt.)
                </label>
                <input
                  type="number"
                  min="0"
                  value={state.stockQuantity}
                  onChange={(e) => setter((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                  className="mt-1.5 block w-full rounded-xl border-0 bg-gray-100 px-4 py-2.5 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30 sm:text-sm"
                  placeholder="Quantité"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={state.publish}
                    onChange={(e) => setter((prev) => ({ ...prev, publish: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/20"
                  />
                  Publier ce format
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* En-tête style iOS */}
      <div className="ios-surface-strong rounded-[2rem] p-8">
        <p className="ios-kicker">Publication</p>
        <h1 className="ios-title text-3xl font-semibold tracking-tight">Laboratoire de publication</h1>
        <p className="ios-muted mt-2 text-base">
          Remplissez les métadonnées et configurez les formats de vente.
        </p>
      </div>

      {/* Section 1: Informations principales */}
      <section className="ios-surface rounded-[2rem] p-8">
        <h2 className="ios-title flex items-center gap-2 text-xl font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-700">
            1
          </span>
          Informations principales
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Titre du livre"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Nom complet de l'auteur *</label>
            <input
              type="text"
              value={authorFullName}
              onChange={(e) => setAuthorFullName(e.target.value)}
              required
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Ex: Marie Claire Kouame"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Sous-titre</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Sous-titre (optionnel)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description / 4e de couverture *</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Présentation du livre..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ISBN (13 chiffres)</label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="9781234567890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Langue *</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="fr, en, ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Maison d'édition</label>
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date de publication</label>
            <input
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de pages</label>
            <input
              type="number"
              min="1"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Co-auteurs (séparés par virgule)</label>
            <input
              type="text"
              value={coAuthors}
              onChange={(e) => setCoAuthors(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Jean Dupont, Marie Curie"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Catégorie principale</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {BOOK_CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleDefaultCategory(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">Chaque livre est rattaché à une seule catégorie du header.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tags (séparés par virgule)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="aventure, futur"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Public cible</label>
            <input
              type="text"
              value={ageRating}
              onChange={(e) => setAgeRating(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Tout public, Adulte, ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Édition</label>
            <input
              type="text"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="1ère édition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom de série</label>
            <input
              type="text"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Le cycle des robots"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Position dans la série</label>
            <input
              type="number"
              min="1"
              value={seriesPosition}
              onChange={(e) => setSeriesPosition(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Texte alternatif de la couverture</label>
            <input
              type="text"
              value={coverAltText}
              onChange={(e) => setCoverAltText(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Description de l'image pour accessibilité"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Fichiers ebook */}
      <section className="ios-surface rounded-[2rem] p-8">
        <h2 className="ios-title flex items-center gap-2 text-xl font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-700">
            2
          </span>
          Fichiers ebook
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Couverture *</label>
            <div className="mt-2 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 transition hover:border-indigo-300">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fichier ebook (EPUB/PDF/MOBI) *</label>
            <div className="mt-2 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 transition hover:border-indigo-300">
              <input
                type="file"
                accept=".epub,.pdf,.mobi,application/epub+zip,application/pdf"
                onChange={(e) => setEbookFile(e.target.files?.[0] ?? null)}
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Extrait (optionnel)</label>
            <div className="mt-2 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 transition hover:border-indigo-300">
              <input
                type="file"
                accept=".epub,.pdf,application/epub+zip,application/pdf"
                onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de pages de l'extrait</label>
            <input
              type="number"
              min="1"
              value={samplePages}
              onChange={(e) => setSamplePages(e.target.value)}
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="10"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Formats et prix */}
      <section className="ios-surface rounded-[2rem] p-8">
        <h2 className="ios-title flex items-center gap-2 text-xl font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-700">
            3
          </span>
          Formats et prix
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Prix ebook *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ebookPrice}
              onChange={(e) => setEbookPrice(e.target.value)}
              required
              className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="9.99"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={ebookPublished}
                onChange={(e) => setEbookPublished(e.target.checked)}
                className="h-5 w-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500/20"
              />
              Ebook en vente
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={ebookDownloadable}
                onChange={(e) => setEbookDownloadable(e.target.checked)}
                className="h-5 w-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500/20"
              />
              Ebook téléchargeable
            </label>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {renderOptionalFormat("Paperback (broché)", paperback, setPaperback, "paperback")}
          {renderOptionalFormat("Hardcover (relié)", hardcover, setHardcover, "hardcover")}
          {renderOptionalFormat("Audiobook", audiobook, setAudiobook, "audiobook")}
        </div>
      </section>

      {/* Section 4: Publication */}
      <section className="ios-surface rounded-[2rem] p-8">
        <h2 className="ios-title flex items-center gap-2 text-xl font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-700">
            4
          </span>
          Publication
        </h2>
        <div className="mt-6 max-w-xs">
          <label className="block text-sm font-medium text-gray-700">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BookStatus)}
            className="mt-2 block w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 shadow-inner focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </select>
        </div>
      </section>

      {/* Messages d'erreur */}
      {invalidIsbn && (
        <div className="ios-danger rounded-2xl p-5">
          <p className="text-sm">ISBN invalide : veuillez saisir exactement 13 chiffres.</p>
        </div>
      )}
      {error && (
        <div className="ios-danger rounded-2xl p-5">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Bouton de soumission */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="ios-button-primary inline-flex items-center rounded-full px-8 py-3 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Publication en cours..." : "Enregistrer dans le laboratoire"}
        </button>
      </div>
    </form>
  );
}
