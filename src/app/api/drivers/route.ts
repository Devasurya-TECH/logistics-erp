import { NextResponse } from "next/server";
import { getDbData, writeDbData } from "@/lib/db-utils";
import type { Driver } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDbData();
    const drivers: Driver[] = (db.users ?? []).filter(
      (user: Driver) => user.role === "driver",
    );
    return NextResponse.json(drivers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, updates } = (await request.json()) as {
      id: string;
      updates: Partial<Driver>;
    };

    const db = await getDbData();
    const users: Driver[] = db.users ?? [];
    const index = users.findIndex((user) => user.id === id && user.role === "driver");

    if (index < 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const updatedDriver: Driver = { ...users[index], ...updates };
    users[index] = updatedDriver;
    db.users = users;
    await writeDbData(db);

    return NextResponse.json(updatedDriver);
  } catch {
    return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
  }
}
