import { Router } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runBookingSync } from "../jobs/booking.job.js";
import equipmentRoutes from "./equipment.routes.js";
import favoriteRoutes from "./favorite.routes.js";
import bookingRoutes from "./booking.routes.js";
import paymentRoutes from "./payment.routes.js";
import userRoutes from "./user.routes.js";
import analyticsRoutes from "./analytics.routes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
router.use("/equipment", equipmentRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/users", userRoutes);
router.use("/analytics", analyticsRoutes);

// Trigger the booking sync manually / from an external scheduler (e.g. Vercel Cron)
router.post(
  "/cron/run",
  asyncHandler(async (req, res) => {
    if (!env.cronSecret || req.headers["x-cron-secret"] !== env.cronSecret) throw new ApiError(401, "Unauthorized");
    res.json(await runBookingSync());
  })
);

export default router;
