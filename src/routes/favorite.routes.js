import { Router } from "express";
import { verifyRenter } from "../middlewares/auth.middleware.js";
import { addFavorite, listFavorites, removeFavorite } from "../controllers/favorite.controller.js";

const router = Router();
router.get("/", verifyRenter, listFavorites);
router.post("/:equipmentId", verifyRenter, addFavorite);
router.delete("/:equipmentId", verifyRenter, removeFavorite);
export default router;
