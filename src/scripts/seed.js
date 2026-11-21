// Seeds sample approved equipment so the UI is populated. Run: npm run seed
import { connectDB, col } from "../config/db.js";

const owners = [
  { id: "seed-owner-1", name: "Rahim Khan", email: "rahim.owner@example.com" },
  { id: "seed-owner-2", name: "Nadia Sultana", email: "nadia.owner@example.com" },
  { id: "seed-owner-3", name: "Imran Hossain", email: "imran.owner@example.com" },
];
const terms = "20% refundable security deposit. Free cancellation up to 48 hours before start. Late returns are charged at 1.5x the rate. Renter is responsible for damage beyond normal wear.";
const rows = [
  ["CAT 305 Mini Excavator", "Construction Equipment", "Chattogram", 85, "daily", 3, "Excellent", "Caterpillar", "305 CR"],
  ["Sony FX6 Cinema Kit", "Photography Equipment", "Dhaka", 120, "daily", 2, "Like new", "Sony", "FX6"],
  ["Kubota M7 Tractor", "Agriculture Equipment", "Rajshahi", 820, "weekly", 2, "Good", "Kubota", "M7-172"],
  ["Ford Transit Cargo Van", "Vehicles & Transportation", "Chattogram", 95, "daily", 0, "Good", "Ford", "Transit"],
  ["LED Wall 3x2 m Panels", "Event Equipment", "Dhaka", 1200, "weekly", 4, "Excellent", "Unilumin", "Upad III"],
  ["MacBook Pro 16 Workstation", "Electronics", "Sylhet", 300, "monthly", 5, "Like new", "Apple", "M3 Max"],
  ["Canon R5 with 24-70 Lens", "Photography Equipment", "Khulna", 70, "daily", 3, "Excellent", "Canon", "EOS R5"],
  ["JCB 3CX Backhoe Loader", "Construction Equipment", "Dhaka", 1900, "monthly", 1, "Good", "JCB", "3CX"],
  ["Stage and Truss Set", "Event Equipment", "Chattogram", 260, "daily", 2, "Good", "ProStage", "Truss-X"],
  ["Combine Harvester", "Agriculture Equipment", "Bogura", 2400, "monthly", 1, "Good", "Claas", "Lexion 560"],
  ["DJI Inspire 3 Drone", "Photography Equipment", "Dhaka", 150, "daily", 2, "Like new", "DJI", "Inspire 3"],
  ["Toyota Hilux 4x4", "Vehicles & Transportation", "Sylhet", 110, "daily", 2, "Good", "Toyota", "Hilux"],
];

await connectDB();
if (await col.equipment().countDocuments({ ownerId: /^seed-owner/ })) {
  console.log("Seed data already exists - skipping.");
  process.exit(0);
}
const base = Date.now();
await col.equipment().insertMany(
  rows.map(([name, category, location, price, rentalType, quantity, condition, brand, model], i) => {
    const o = owners[i % owners.length];
    const createdAt = new Date(base - (rows.length - i) * 3600 * 1000 * 5);
    return {
      name, category, location, price, rentalType, quantity, condition, brand, model,
      description: `${brand} ${model} in ${condition.toLowerCase()} condition, inspected and ready for immediate use. Delivery available on request.`,
      imageUrl: "", terms, status: "approved",
      ownerId: o.id, ownerName: o.name, ownerEmail: o.email, ownerPhoto: "",
      createdAt, updatedAt: createdAt,
    };
  })
);
console.log(`Seeded ${rows.length} equipment items.`);
process.exit(0);
