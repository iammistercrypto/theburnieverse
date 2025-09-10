// app/api/zeroex/quote/route.ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

function withTimeout<T>(p: Promise<T>, ms = 12000) {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("fetch_timeout")), ms);
    p.then((v) => { clearTimeout(id); resolve(v); },
           (e) => { clearTimeout(id); reject(e); });
  });
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.ZEROX_API_KEY || process.env.NEXT_PUBLIC_ZEROX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ZEROX_API_KEY" }, { status: 500 });
  }

  const inbound = new URL(req.url);
  const url = new URL("https://base.api.0x.org/swap/allowance-holder/quote");

  // forward query exactly; chainId on base subdomain is harmless either way
  for (const [k, v] of inbound.searchParams) url.searchParams.set(k, v);

  const headers: Record<string, string> = {
    "0x-api-key": apiKey,
    "0x-version": "v2",
    "accept": "application/json",
  };

  try {
    const res = await withTimeout(fetch(url.toString(), { headers, cache: "no-store" }));
    const bodyText = await res.text();
    if (!res.ok) {
      console.warn("[0x proxy] non-200", res.status, res.statusText, bodyText);
    }
    const out = new NextResponse(bodyText, { status: res.status });
    const trace = res.headers.get("x-0x-trace-id");
    if (trace) out.headers.set("x-0x-trace-id", trace);
    out.headers.set("content-type", res.headers.get("content-type") || "application/json");
    return out;
  } catch (e: any) {
    console.error("[0x proxy] fetch failed:", e?.message || e);
    return NextResponse.json({ error: e?.message || "proxy_failed" }, { status: 502 });
  }
}
