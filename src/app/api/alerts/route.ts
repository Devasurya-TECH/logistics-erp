import { NextResponse } from "next/server";
import { getDbData, writeDbData } from "@/lib/db-utils";
import type { Alert } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDbData();
    return NextResponse.json(db.alerts ?? []);
  } catch {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const nextAlert = (await request.json()) as Alert;
    const db = await getDbData();
    db.alerts = [nextAlert, ...(db.alerts ?? [])];
    await writeDbData(db);
    return NextResponse.json(nextAlert, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, updates } = (await request.json()) as {
      id: string;
      updates: Partial<Alert>;
    };

    const db = await getDbData();
    const alerts: Alert[] = db.alerts ?? [];
    const index = alerts.findIndex((item) => item.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const updatedAlert: Alert = { ...alerts[index], ...updates };
    alerts[index] = updatedAlert;
    db.alerts = alerts;
    await writeDbData(db);

    return NextResponse.json(updatedAlert);
  } catch {
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
