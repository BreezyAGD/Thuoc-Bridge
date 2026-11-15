import { extractLabel } from "@/lib/extract";
import { ExtractRequestSchema, type ExtractResult } from "@/lib/schema";

// Vision calls can take a while; give the function room on Vercel.
export const maxDuration = 60;

const HTTP_STATUS: Record<string, number> = {
  bad_request: 400,
  no_api_key: 500,
  auth: 500,
  rate_limited: 429,
  network: 502,
  api_error: 502,
};

/**
 * POST /api/extract  { image: <base64>, mediaType }
 *
 * PRIVACY: the request body contains a photo. Never log it, never write it to
 * disk. Only the outcome and timing are logged.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "error", code: "bad_request", message: "Body must be JSON." } satisfies ExtractResult,
      { status: 400 },
    );
  }

  const parsed = ExtractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        status: "error",
        code: "bad_request",
        message: "Expected { image: base64 string, mediaType: image/jpeg | image/png | image/webp }.",
      } satisfies ExtractResult,
      { status: 400 },
    );
  }

  const result = await extractLabel(parsed.data);

  if (result.status === "error") {
    console.warn(`[extract] error code=${result.code}`);
    return Response.json(result, { status: HTTP_STATUS[result.code] ?? 500 });
  }
  console.info(`[extract] ${result.status} ${result.ms}ms`);
  return Response.json(result);
}
