const fs = require("fs");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "db.json");

function readDb() {
    if (!fs.existsSync(dbPath)) {
        throw new Error(`DB file not found: ${dbPath}`);
    }
    const raw = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(raw);
}

function resetDriver(driver, nowIso) {
    return {
        ...driver,
        status: "available",
        isLive: true,
        dutyStatus: "on-duty",
        onBreak: false,
        breakStartedAt: undefined,
        breakType: undefined,
        totalBreakMinutes: 0,
        currentVehicleId: undefined,
        dayEndedAt: undefined,
        lastActivityAt: nowIso,
        lastLocationUpdate: nowIso,
    };
}

function main() {
    const db = readDb();
    const nowIso = new Date().toISOString();

    db.users = (db.users || []).map((user) =>
        user.role === "driver" ? resetDriver(user, nowIso) : user
    );
    db.trips = [];
    db.fuelEntries = [];
    db.alerts = [];

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    const driverCount = (db.users || []).filter((u) => u.role === "driver").length;
    console.log(`Reset complete: ${driverCount} drivers available, 0 trips, 0 fuel entries, 0 alerts.`);
}

try {
    main();
} catch (error) {
    console.error("Failed to reset data:", error.message || error);
    process.exit(1);
}
