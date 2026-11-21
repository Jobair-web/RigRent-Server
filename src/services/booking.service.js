import { col } from "../config/db.js";
import { env } from "../config/env.js";
import { getStripe } from "../config/stripe.js";
import { BOOKING_STATUS, PAYMENT_STATUS } from "../constants/index.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, paginated } from "../utils/pagination.js";
import { toObjectId } from "../utils/objectId.js";
import { calcRentalAmount, todayISO } from "../utils/rental.js";
import { sendBookingCompletedEmails } from "./email.service.js";

const LOCKING = [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACTIVE];

/** Units still free for the date range = total units - units held by overlapping paid bookings. */
export async function getAvailableQuantity(equipment, startDate, endDate) {
  const [row] = await col
    .bookings()
    .aggregate([
      {
        $match: {
          equipmentId: equipment._id.toString(),
          paymentStatus: PAYMENT_STATUS.PAID,
          bookingStatus: { $in: LOCKING },
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      },
      { $group: { _id: null, held: { $sum: "$quantity" } } },
    ])
    .toArray();
  return Math.max(0, equipment.quantity - (row?.held || 0));
}

export async function createCheckout(user, body) {
  const { equipmentId, startDate, endDate, contactNumber, deliveryAddress, notes = "" } = body;
  const quantity = Number(body.quantity);

  if (!equipmentId || !startDate || !endDate || !contactNumber?.trim() || !deliveryAddress?.trim())
    throw new ApiError(400, "Dates, quantity, contact number and delivery address are required");
  if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError(400, "Quantity must be at least 1");
  if (startDate < todayISO()) throw new ApiError(400, "Start date cannot be in the past");
  if (endDate < startDate) throw new ApiError(400, "End date must be on or after the start date");

  const equipment = await col.equipment().findOne({ _id: toObjectId(equipmentId), status: "approved" });
  if (!equipment) throw new ApiError(404, "Equipment not found");

  const available = await getAvailableQuantity(equipment, startDate, endDate);
  if (quantity > available)
    throw new ApiError(409, available ? `Only ${available} unit(s) available for these dates` : "Not available for these dates");

  const totalAmount = calcRentalAmount({
    rentalType: equipment.rentalType,
    price: equipment.price,
    startDate,
    endDate,
    quantity,
  });

  const now = new Date();
  const { insertedId } = await col.bookings().insertOne({
    equipmentId: equipment._id.toString(),
    equipmentName: equipment.name,
    equipmentImage: equipment.imageUrl || "",
    category: equipment.category,
    rentalType: equipment.rentalType,
    price: equipment.price,
    customerId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    ownerId: equipment.ownerId,
    ownerName: equipment.ownerName,
    ownerEmail: equipment.ownerEmail,
    startDate,
    endDate,
    quantity,
    contactNumber: contactNumber.trim(),
    deliveryAddress: deliveryAddress.trim(),
    notes: notes.trim(),
    totalAmount,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    bookingStatus: BOOKING_STATUS.PENDING,
    createdAt: now,
    updatedAt: now,
  });

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: insertedId.toString(),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(totalAmount * 100),
          product_data: { name: equipment.name, description: `${startDate} to ${endDate} - Qty ${quantity}` },
        },
      },
    ],
    metadata: { bookingId: insertedId.toString(), customerId: user.id },
    success_url: `${env.clientUrls[0]}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrls[0]}/payment/cancel`,
  });

  await col.bookings().updateOne({ _id: insertedId }, { $set: { stripeSessionId: session.id } });
  return { url: session.url, bookingId: insertedId.toString() };
}

/** Idempotent: safe to call from both the success page and the Stripe webhook. */
export async function finalizePaidSession(session) {
  if (session.payment_status !== "paid") return null;
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return null;

  const _id = toObjectId(bookingId);
  const booking = await col.bookings().findOne({ _id });
  if (!booking) return null;

  if (booking.paymentStatus !== PAYMENT_STATUS.PAID) {
    await col.bookings().updateOne(
      { _id },
      {
        $set: {
          paymentStatus: PAYMENT_STATUS.PAID,
          bookingStatus: BOOKING_STATUS.CONFIRMED,
          paidAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  await col.payments().updateOne(
    { sessionId: session.id },
    {
      $setOnInsert: {
        bookingId,
        equipmentId: booking.equipmentId,
        equipmentName: booking.equipmentName,
        customerId: booking.customerId,
        ownerId: booking.ownerId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency,
        transactionId: session.payment_intent,
        sessionId: session.id,
        status: "succeeded",
        paidAt: new Date(),
      },
    },
    { upsert: true }
  );
  return col.bookings().findOne({ _id });
}

export async function listBookings(filter, query) {
  const pg = getPagination(query, 10);
  const f = { ...filter };
  if (query.status) f.bookingStatus = query.status;
  const [items, total] = await Promise.all([
    col.bookings().find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).toArray(),
    col.bookings().countDocuments(f),
  ]);
  return paginated(items, total, pg);
}

export async function updateBookingStatus(user, id, status) {
  const allowed = Object.values(BOOKING_STATUS).filter((s) => s !== BOOKING_STATUS.PENDING);
  if (!allowed.includes(status)) throw new ApiError(400, "Invalid booking status");

  const _id = toObjectId(id);
  const booking = await col.bookings().findOne({ _id });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (user.role === "owner" && booking.ownerId !== user.id) throw new ApiError(403, "Not your equipment booking");
  if (booking.paymentStatus !== PAYMENT_STATUS.PAID) throw new ApiError(400, "Booking is not paid yet");

  await col.bookings().updateOne({ _id }, { $set: { bookingStatus: status, updatedAt: new Date() } });
  if (status === BOOKING_STATUS.COMPLETED && booking.bookingStatus !== BOOKING_STATUS.COMPLETED) {
    sendBookingCompletedEmails(booking);
  }
  return col.bookings().findOne({ _id });
}
