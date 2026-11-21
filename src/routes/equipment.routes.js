import { Router } from "express";
import { verifyAdmin, verifyOwner, verifyOwnerOrAdmin, verifyToken } from "../middlewares/auth.middleware.js";
import * as c from "../controllers/equipment.controller.js";

const router = Router();

router.get("/", c.listEquipment);
router.get("/featured", c.featuredEquipment);
router.get("/categories", c.categoryCounts);
router.get("/owner/mine", verifyOwner, c.ownerEquipment);
router.get("/admin/all", verifyAdmin, c.adminEquipment);
router.post("/", verifyOwner, c.createEquipment);

router.get("/:id", verifyToken, c.getEquipment);
router.put("/:id", verifyOwnerOrAdmin, c.updateEquipment);
router.delete("/:id", verifyOwnerOrAdmin, c.deleteEquipment);
router.patch("/:id/status", verifyAdmin, c.setEquipmentStatus);

export default router;
