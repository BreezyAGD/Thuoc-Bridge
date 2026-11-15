import { reconcile, ReconcileRequestSchema } from "@/lib/reconcile";

export const maxDuration = 30;

/**
 * POST /api/reconcile  { products: [{ id, extraction }], usMeds: [{ id, text }] }
 *
 * Deterministic: guard checks + RxNorm normalization via RxNav. No LLM call.
 * No images are sent to this route, and request bodies are not logged.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = ReconcileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid reconcile request." }, { status: 400 });
  }
  const started = Date.now();
  const result = await reconcile(parsed.data);
  console.info(
    `[reconcile] products=${result.products.length} usMeds=${result.usMeds.length} ${Date.now() - started}ms`,
  );
  return Response.json(result);
}
