import { Router } from "express";
import { verifyAdmin, verifyOwner } from "../middlewares/auth.middleware.js";
import { adminAnalytics, ownerAnalytics } from "../controllers/analytics.controller.js";

const router = Router();
router.get("/admin", verifyAdmin, adminAnalytics);
router.get("/owner", verifyOwner, ownerAnalytics);
export default router;
