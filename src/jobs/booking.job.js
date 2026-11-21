import cron from "node-cron";
import { col } from "../config/db.js";
import { BOOKING_STATUS, PAYMENT_STATUS } from "../constants/index.js";
import { todayISO } from "../utils/rental.js";
import { sendBookingCompletedEmails } from "../services/email.service.js";

/**
 * Keeps booking statuses in sync with the calendar:
 *  confirmed -> active (rental period started)
 *  confirmed/active -> completed (end date passed) + email to renter & owner
 *  unpaid pending bookings older than 1 hour -> cancelled
 */
export async function runBookingSync() {
  const today = todayISO();
  const paid = { paymentStatus: PAYMENT_STATUS.PAID };

  const activated = await col.bookings().updateMany(
    { ...paid, bookingStatus: BOOKING_STATUS.CONFIRMED, startDate: { $lte: today }, endDate: { $gte: today } },
    { $set: { bookingStatus: BOOKING_STATUS.ACTIVE, updatedAt: new Date() } }
  );

  const due = await col
    .bookings()
    .find({ ...paid, bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACTIVE] }, endDate: { $lt: today } })
    .toArray();
  if (due.length) {
    await col.bookings().updateMany(
      { _id: { $in: due.map((b) => b._id) } },
      { $set: { bookingStatus: BOOKING_STATUS.COMPLETED, updatedAt: new Date() } }
    );
    await Promise.all(due.map((b) => sendBookingCompletedEmails(b)));
  }

  const expired = await col.bookings().updateMany(
    { paymentStatus: PAYMENT_STATUS.UNPAID, bookingStatus: BOOKING_STATUS.PENDING, createdAt: { $lt: new Date(Date.now() - 3600 * 1000) } },
    { $set: { bookingStatus: BOOKING_STATUS.CANCELLED, updatedAt: new Date() } }
  );

  const result = { activated: activated.modifiedCount, completed: due.length, expired: expired.modifiedCount };
  console.log("[cron] booking sync:", result);
  return result;
}

export function startBookingCron() {
  cron.schedule("5 0 * * *", () => runBookingSync().catch(console.error));
  runBookingSync().catch(console.error);
  console.log("[cron] booking sync scheduled (daily 00:05)");
}
