import { asyncHandler } from "../utils/asyncHandler.js";
import * as bookingService from "../services/booking.service.js";

export const createCheckoutSession = asyncHandler(async (req, res) => {
  res.status(201).json(await bookingService.createCheckout(req.user, req.body));
});

export const myBookings = asyncHandler(async (req, res) => {
  res.json(await bookingService.listBookings({ customerId: req.user.id }, req.query));
});

export const ownerBookings = asyncHandler(async (req, res) => {
  res.json(await bookingService.listBookings({ ownerId: req.user.id, paymentStatus: "paid" }, req.query));
});

export const allBookings = asyncHandler(async (req, res) => {
  res.json(await bookingService.listBookings({}, req.query));
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  res.json(await bookingService.updateBookingStatus(req.user, req.params.id, req.body.status));
});
