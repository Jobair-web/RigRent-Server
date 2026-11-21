import { Router } from "express";
import { verifyAdmin, verifyOwner, verifyOwnerOrAdmin, verifyRenter } from "../middlewares/auth.middleware.js";
import * as c from "../controllers/booking.controller.js";

const router = Router();
router.post("/checkout", verifyRenter, c.createCheckoutSession);
router.get("/my", verifyRenter, c.myBookings);
router.get("/owner", verifyOwner, c.ownerBookings);
router.get("/", verifyAdmin, c.allBookings);
router.patch("/:id/status", verifyOwnerOrAdmin, c.updateBookingStatus);
export default router;
