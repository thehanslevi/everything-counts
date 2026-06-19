"use server";

import { revalidatePath } from "next/cache";
import { addLog } from "@/lib/data/logs";
import { FORMS, type Form, type Log } from "@/lib/data/types";

export interface CreateLogResult {
  ok: boolean;
  error?: string;
  log?: Log;
}

// Server action invoked by the logging form. Validates the submitted fields and
// writes through the data-access layer (addLog), never to the store directly.
export async function createLog(
  formData: FormData,
): Promise<CreateLogResult> {
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const formValue = (formData.get("form") as string | null) ?? "";
  const ratingRaw = (formData.get("rating") as string | null)?.trim() ?? "";

  if (!title) {
    return { ok: false, error: "A title is required." };
  }

  if (!FORMS.includes(formValue as Form)) {
    return { ok: false, error: "Pick a form for the piece." };
  }

  let rating: number | null = null;
  if (ratingRaw) {
    const parsed = Number(ratingRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return { ok: false, error: "Rating must be between 1 and 5." };
    }
    rating = parsed;
  }

  const log = await addLog({
    url: (formData.get("url") as string | null) ?? null,
    title,
    author: (formData.get("author") as string | null) ?? null,
    source: (formData.get("source") as string | null) ?? null,
    image: (formData.get("image") as string | null) ?? null,
    form: formValue as Form,
    take: (formData.get("take") as string | null) ?? null,
    rating,
  });

  // Refresh the profile and the feed so a newly shared log shows on both.
  revalidatePath("/");
  revalidatePath("/feed");

  return { ok: true, log };
}
