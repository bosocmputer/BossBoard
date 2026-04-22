import { NextRequest, NextResponse } from "next/server";
import {
  listClientProfiles,
  createClientProfile,
} from "@/lib/client-profiles";

export async function GET() {
  try {
    const profiles = listClientProfiles();
    return NextResponse.json(profiles);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, taxId, businessType, vatRegistered, fiscalYearEnd, accountingStandard, notes } = body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const profile = createClientProfile({
      name: name.trim(),
      taxId,
      businessType,
      vatRegistered,
      fiscalYearEnd,
      accountingStandard,
      notes,
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
