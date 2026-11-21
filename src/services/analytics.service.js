import { col } from "../config/db.js";
import { BOOKING_STATUS, EQUIPMENT_STATUS } from "../constants/index.js";

const monthKeys = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1));
    return d.toISOString().slice(0, 7);
  });
};

const since = () => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 11, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const monthly = async (collection, match, dateField, accumulator) => {
  const rows = await collection
    .aggregate([
      { $match: { ...match, [dateField]: { $gte: since() } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: `$${dateField}` } }, value: accumulator } },
    ])
    .toArray();
  const map = Object.fromEntries(rows.map((r) => [r._id, r.value]));
  return monthKeys().map((k) => ({
    month: k,
    label: new Date(`${k}-01T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    value: map[k] || 0,
  }));
};

const sum = async (collection, match, field) => {
  const [row] = await collection.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }]).toArray();
  return row?.total || 0;
};

const statusBreakdown = async (match) => {
  const rows = await col.bookings().aggregate([{ $match: match }, { $group: { _id: "$bookingStatus", count: { $sum: 1 } } }]).toArray();
  return rows.map((r) => ({ status: r._id, count: r.count }));
};

export async function getAdminAnalytics() {
  const [totalUsers, totalEquipment, totalBookings, pendingApprovals, completedRentals, totalRevenue, monthlyBookings, monthlyRevenue, statuses] =
    await Promise.all([
      col.users().countDocuments(),
      col.equipment().countDocuments(),
      col.bookings().countDocuments({ paymentStatus: "paid" }),
      col.equipment().countDocuments({ status: EQUIPMENT_STATUS.PENDING }),
      col.bookings().countDocuments({ bookingStatus: BOOKING_STATUS.COMPLETED }),
      sum(col.payments(), {}, "amount"),
      monthly(col.bookings(), { paymentStatus: "paid" }, "createdAt", { $sum: 1 }),
      monthly(col.payments(), {}, "paidAt", { $sum: "$amount" }),
      statusBreakdown({ paymentStatus: "paid" }),
    ]);
  return { totalUsers, totalEquipment, totalBookings, pendingApprovals, completedRentals, totalRevenue, monthlyBookings, monthlyRevenue, statusBreakdown: statuses };
}

export async function getOwnerAnalytics(ownerId) {
  const mine = { ownerId };
  const [totalEquipment, totalBookings, completedRentals, totalEarnings, monthlyEarnings, monthlyBookings, statuses] = await Promise.all([
    col.equipment().countDocuments(mine),
    col.bookings().countDocuments({ ...mine, paymentStatus: "paid" }),
    col.bookings().countDocuments({ ...mine, bookingStatus: BOOKING_STATUS.COMPLETED }),
    sum(col.payments(), mine, "amount"),
    monthly(col.payments(), mine, "paidAt", { $sum: "$amount" }),
    monthly(col.bookings(), { ...mine, paymentStatus: "paid" }, "createdAt", { $sum: 1 }),
    statusBreakdown({ ...mine, paymentStatus: "paid" }),
  ]);
  return { totalEquipment, totalBookings, completedRentals, totalEarnings, monthlyEarnings, monthlyBookings, statusBreakdown: statuses };
}
