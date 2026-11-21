import { col } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toObjectId } from "../utils/objectId.js";

export const listFavorites = asyncHandler(async (req, res) => {
  const favs = await col.favorites().find({ userId: req.user.id }).sort({ createdAt: -1 }).toArray();
  const ids = favs.map((f) => toObjectId(f.equipmentId));
  const items = await col.equipment().find({ _id: { $in: ids } }).toArray();
  const order = new Map(favs.map((f, i) => [f.equipmentId, i]));
  items.sort((a, b) => order.get(a._id.toString()) - order.get(b._id.toString()));
  res.json(items);
});

export const addFavorite = asyncHandler(async (req, res) => {
  const equipment = await col.equipment().findOne({ _id: toObjectId(req.params.equipmentId), status: "approved" });
  if (!equipment) throw new ApiError(404, "Equipment not found");
  await col.favorites().updateOne(
    { userId: req.user.id, equipmentId: equipment._id.toString() },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  res.status(201).json({ message: "Added to favorites" });
});

export const removeFavorite = asyncHandler(async (req, res) => {
  await col.favorites().deleteOne({ userId: req.user.id, equipmentId: req.params.equipmentId });
  res.json({ message: "Removed from favorites" });
});
