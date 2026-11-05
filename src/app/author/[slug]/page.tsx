import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/data/logs";
import { CatalogView } from "@/components/CatalogView";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const catalog = await getCatalog("author", slug);
  if (!catalog) return { title: "Everything Counts" };
  const n = catalog.works.length;
  return {
    title: `${catalog.name} — Everything Counts`,
    description: `${n} ${n === 1 ? "piece" : "pieces"} by ${catalog.name}, logged on Everything Counts.`,
  };
}

// Everything logged here by one author.
export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const catalog = await getCatalog("author", slug);
  if (!catalog) notFound();
  return <CatalogView kind="author" catalog={catalog} />;
}
