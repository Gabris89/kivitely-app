import { NextResponse } from "next/server";
import { listTigPackages } from "@/lib/repository";

export async function GET() {
  return NextResponse.json({ data: listTigPackages() });
}
