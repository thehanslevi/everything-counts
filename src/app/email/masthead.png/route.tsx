import { emailMasthead } from "@/lib/og";

// GET /email/masthead.png — the header image the weekly email points at.
// No request data goes into it, so it is built once and served as a file.
export const dynamic = "force-static";

export async function GET() {
  return emailMasthead();
}
