import { createClient } from "@/lib/supabase/server";

type FileType = "epub" | "pdf";

type BookFormat = {
  format: string;
  file_url: string | null;
  price: number | null;
  is_published: boolean;
};

type Book = {
  id: string;
  file_url: string | null;
  price: number | null;
  status: string;
  book_formats: BookFormat[] | null;
};

export type ReadAccessResult =
  | { ok: true; filePath: string; fileType: FileType }
  | { ok: false; status: number; error: string };

function getFileType(path: string): FileType | null {
  const lower = path.toLowerCase();

  if (lower.endsWith(".epub")) return "epub";
  if (lower.endsWith(".pdf")) return "pdf";

  return null;
}

export async function resolveReadAccess(
  bookId: string,
  userId: string
): Promise<ReadAccessResult> {

  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select(
      "id, file_url, price, status, book_formats!left(format, file_url, price, is_published)"
    )
    .eq("id", bookId)
    .eq("status", "published")
    .maybeSingle();

  const typedBook = book as Book | null;

  if (!typedBook || typedBook.status !== "published") {
    return {
      ok: false,
      status: 404,
      error: "Livre introuvable.",
    };
  }

  const formats = typedBook.book_formats ?? [];

  const ebookFormat = formats.find(
    (fmt) => fmt.format === "ebook" && fmt.is_published
  );

  const effectivePrice = ebookFormat?.price ?? typedBook.price ?? 0;

  if (effectivePrice > 0) {
    const { data: libraryRow } = await supabase
      .from("library")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (!libraryRow) {
      return {
        ok: false,
        status: 403,
        error: "Achat requis pour lire ce livre.",
      };
    }
  } else {
    await supabase
      .from("library")
      .upsert(
        { user_id: userId, book_id: bookId },
        { onConflict: "user_id,book_id" }
      );
  }

  const secureFilePath = ebookFormat?.file_url ?? typedBook.file_url;

  if (!secureFilePath) {
    return {
      ok: false,
      status: 404,
      error: "Aucun fichier lisible disponible.",
    };
  }

  const fileType = getFileType(secureFilePath);

  if (!fileType) {
    return {
      ok: false,
      status: 400,
      error: "Type de fichier non supporté.",
    };
  }

  return {
    ok: true,
    filePath: secureFilePath,
    fileType,
  };
}
