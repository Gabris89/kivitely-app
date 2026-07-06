import { NextResponse } from "next/server";
import { listTigPackages } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listTigPackages() });
}
