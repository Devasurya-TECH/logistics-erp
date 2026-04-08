import { NextResponse } from "next/server";
import { getDbData, writeDbData } from "@/lib/db-utils";
import type { FuelEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDbData();
    return NextResponse.json(db.fuelEntries ?? []);
  } catch {
    return NextResponse.json({ error: "Failed to fetch fuel entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const nextEntry = (await request.json()) as FuelEntry;
    const db = await getDbData();
    db.fuelEntries = [...(db.fuelEntries ?? []), nextEntry];
    await writeDbData(db);
    return NextResponse.json(nextEntry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create fuel entry" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, updates } = (await request.json()) as {
      id: string;
      updates: Partial<FuelEntry>;
    };

    const db = await getDbData();
    const entries: FuelEntry[] = db.fuelEntries ?? [];
    const index = entries.findIndex((entry) => entry.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Fuel entry not found" }, { status: 404 });
    }

    const updatedEntry: FuelEntry = { ...entries[index], ...updates };
    entries[index] = updatedEntry;
    db.fuelEntries = entries;
    await writeDbData(db);

    return NextResponse.json(updatedEntry);
  } catch {
    return NextResponse.json({ error: "Failed to update fuel entry" }, { status: 500 });
  }
}
