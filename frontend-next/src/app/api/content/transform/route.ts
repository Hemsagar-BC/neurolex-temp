import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 120000;

function normalizeHttpUrl(rawUrl: string): string {
  let url = rawUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    const looksLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(url);
    url = `${looksLocal ? "http" : "https"}://${url}`;
  }
  return url;
}

function ensureApiSuffix(url: string): string {
  return /\/api$/i.test(url) ? url : `${url}/api`;
}

function getConfiguredApiBase(): string | null {
  const configuredFromEnv =
    process.env.BACKEND_API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!configuredFromEnv?.trim()) {
    return null;
  }

  return ensureApiSuffix(normalizeHttpUrl(configuredFromEnv));
}

function getUpstreamApiBaseCandidates(): string[] {
  const candidates: string[] = [];
  const configured = getConfiguredApiBase();

  if (configured) {
    candidates.push(configured);
  }

  const inKubernetes = Boolean(process.env.KUBERNETES_SERVICE_HOST);
  if (inKubernetes) {
    candidates.push("http://neurolex-backend:8001/api");
  }

  candidates.push("http://localhost:8001/api");

  return [...new Set(candidates)];
}

export async function POST(request: Request) {
  const apiBases = getUpstreamApiBaseCandidates();
  const hasConfiguredApiBase = Boolean(getConfiguredApiBase());

  if (process.env.NODE_ENV === "production" && !hasConfiguredApiBase && !process.env.KUBERNETES_SERVICE_HOST) {
    return NextResponse.json(
      {
        detail:
          "Backend URL is not configured. Set BACKEND_API_URL or BACKEND_URL in Vercel project environment variables.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();
    let lastError: any = null;

    for (const apiBase of apiBases) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

      try {
        const upstream = await fetch(`${apiBase}/content/transform`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
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
        lastError = error;
      }
    }

    throw lastError || new Error("Upstream content service is unavailable");
  } catch (error: any) {
    const detail =
      error?.name === "AbortError"
        ? "Content service timed out while waiting for backend response."
        : error?.message || "Upstream content service is unavailable";

    return NextResponse.json(
      { detail, upstreamCandidates: apiBases },
      { status: 502 }
    );
  }
}
