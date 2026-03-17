import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 120000;

function normalizeHttpUrl(rawUrl: string): string {
  let url = rawUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

function getUpstreamApiBase() {
  const configuredFromEnv =
    process.env.BACKEND_API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  const usingFallback = !configuredFromEnv?.trim();
  const configured = configuredFromEnv?.trim() || "http://localhost:8000/api";
  const normalized = normalizeHttpUrl(configured);
  const apiBase = /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;

  return { apiBase, usingFallback };
}

export async function POST(request: Request) {
  const { apiBase, usingFallback } = getUpstreamApiBase();

  if (process.env.NODE_ENV === "production" && usingFallback) {
    return NextResponse.json(
      {
        detail:
          "Backend URL is not configured. Set BACKEND_API_URL or BACKEND_URL in Vercel project environment variables.",
      },
      { status: 503 }
    );
  }

  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    const userId = incoming.get("userId");

    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "No image file provided" }, { status: 400 });
    }

    const body = new FormData();
    body.append("file", file);
    if (typeof userId === "string" && userId.trim()) {
      body.append("userId", userId.trim());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    const upstream = await fetch(`${apiBase}/handwriting/analyze`, {
      method: "POST",
      body,
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const contentType = upstream.headers.get("content-type") || "application/json";
    const payload = await upstream.text();

    return new NextResponse(payload, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (error: any) {
    const detail =
      error?.name === "AbortError"
        ? "Handwriting service timed out while waiting for backend response."
        : error?.message || "Upstream handwriting service is unavailable";

    return NextResponse.json(
      { detail, upstream: apiBase },
      { status: 502 }
    );
  }
}
