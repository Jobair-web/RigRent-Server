import { Router } from "express";
import { verifyAdmin, verifyToken } from "../middlewares/auth.middleware.js";
import * as c from "../controllers/user.controller.js";

const router = Router();
router.get("/me", verifyToken, c.getMe);
router.patch("/me", verifyToken, c.updateMe);
router.get("/", verifyAdmin, c.listUsers);
router.patch("/:id/role", verifyAdmin, c.changeRole);
router.delete("/:id", verifyAdmin, c.deleteUser);
export default router;
