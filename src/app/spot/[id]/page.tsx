import { notFound } from "next/navigation";
import SpotView from "@/components/SpotView";
import { SPOT_BY_ID } from "@/lib/spots";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${SPOT_BY_ID[id]?.name ?? "Spot"} – Vent Sardaigne` };
}

export default async function SpotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { id } = await params;
  const { d } = await searchParams;
  if (!SPOT_BY_ID[id]) notFound();
  return <SpotView id={id} initialDate={d ?? null} />;
}
