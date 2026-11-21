import { Router } from "express";
import { verifyRenter } from "../middlewares/auth.middleware.js";
import { confirmPayment } from "../controllers/payment.controller.js";

const router = Router();
router.post("/confirm", verifyRenter, confirmPayment);
export default router;
