import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, CompanyInfo } from "@/lib/agents-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit-redis";

export async function GET() {
  const settings = getSettings();
  // Return masked keys (show only last 6 chars)
  return NextResponse.json({
    hasSerperKey: !!settings.serperApiKey,
    hasSerpApiKey: !!settings.serpApiKey,
    serperKeyPreview: settings.serperApiKey ? `...${settings.serperApiKey.slice(-6)}` : null,
    serpApiKeyPreview: settings.serpApiKey ? `...${settings.serpApiKey.slice(-6)}` : null,
    companyInfo: settings.companyInfo ?? null,
    updatedAt: settings.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  if (!await rateLimit(getClientIp(req.headers), { maxRequests: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await req.json();
  const { serperApiKey, serpApiKey, companyInfo } = body as { serperApiKey?: string; serpApiKey?: string; companyInfo?: CompanyInfo };
  const result = saveSettings({ serperApiKey, serpApiKey, companyInfo });
  return NextResponse.json({
    hasSerperKey: !!result.serperApiKey,
    hasSerpApiKey: !!result.serpApiKey,
    companyInfo: result.companyInfo ?? null,
    updatedAt: result.updatedAt,
  });
}
