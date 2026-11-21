import { col } from "../config/db.js";
import { CATEGORIES, EQUIPMENT_STATUS, RENTAL_TYPES, ROLES } from "../constants/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex, getPagination, paginated } from "../utils/pagination.js";
import { toObjectId } from "../utils/objectId.js";

const required = (v, label) => {
  if (typeof v !== "string" || !v.trim()) throw new ApiError(400, `${label} is required`);
  return v.trim();
};

function buildPayload(b) {
  const price = Number(b.price);
  const quantity = Number(b.quantity);
  if (!CATEGORIES.includes(b.category)) throw new ApiError(400, "Invalid category");
  if (!RENTAL_TYPES.includes(b.rentalType)) throw new ApiError(400, "Invalid rental type");
  if (!(price > 0)) throw new ApiError(400, "Rental price must be greater than 0");
  if (!Number.isInteger(quantity) || quantity < 0) throw new ApiError(400, "Quantity must be a whole number");
  return {
    name: required(b.name, "Equipment name"),
    description: required(b.description, "Description"),
    category: b.category,
    location: required(b.location, "Location"),
    price,
    rentalType: b.rentalType,
    quantity,
    condition: required(b.condition, "Condition"),
    brand: required(b.brand, "Brand"),
    model: required(b.model, "Model"),
    imageUrl: (b.imageUrl || "").trim(),
    terms: (b.terms || "").trim(),
  };
}

const SORTS = { recent: { createdAt: -1 }, "price-asc": { price: 1, _id: -1 }, "price-desc": { price: -1, _id: -1 } };

/** Public listing: backend search, filters, sorting and pagination (approved items only). */
export const listEquipment = asyncHandler(async (req, res) => {
  const { search, category, rentalType, minPrice, maxPrice, availability, sort = "recent" } = req.query;
  const pg = getPagination(req.query, 9);
  const filter = { status: EQUIPMENT_STATUS.APPROVED };

  if (search?.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: rx }, { location: rx }, { category: rx }];
  }
  if (category) filter.category = category;
  if (rentalType) filter.rentalType = rentalType;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (availability === "available") filter.quantity = { $gt: 0 };
  if (availability === "unavailable") filter.quantity = 0;

  const [items, total] = await Promise.all([
    col.equipment().find(filter).sort(SORTS[sort] || SORTS.recent).skip(pg.skip).limit(pg.limit).toArray(),
    col.equipment().countDocuments(filter),
  ]);
  res.json(paginated(items, total, pg));
});

export const featuredEquipment = asyncHandler(async (req, res) => {
  const limit = Math.min(12, Number(req.query.limit) || 6);
  const items = await col.equipment().find({ status: EQUIPMENT_STATUS.APPROVED }).sort({ createdAt: -1 }).limit(limit).toArray();
  res.json(items);
});

export const categoryCounts = asyncHandler(async (_req, res) => {
  const rows = await col.equipment().aggregate([{ $match: { status: EQUIPMENT_STATUS.APPROVED } }, { $group: { _id: "$category", count: { $sum: 1 } } }]).toArray();
  res.json(Object.fromEntries(rows.map((r) => [r._id, r.count])));
});

export const getEquipment = asyncHandler(async (req, res) => {
  const item = await col.equipment().findOne({ _id: toObjectId(req.params.id) });
  if (!item) throw new ApiError(404, "Equipment not found");
  const privileged = req.user.role === ROLES.ADMIN || item.ownerId === req.user.id;
  if (item.status !== EQUIPMENT_STATUS.APPROVED && !privileged) throw new ApiError(404, "Equipment not found");
  res.json(item);
});

export const ownerEquipment = asyncHandler(async (req, res) => {
  res.json(await col.equipment().find({ ownerId: req.user.id }).sort({ createdAt: -1 }).toArray());
});

export const adminEquipment = asyncHandler(async (_req, res) => {
  res.json(await col.equipment().find().sort({ createdAt: -1 }).toArray());
});

export const createEquipment = asyncHandler(async (req, res) => {
  const now = new Date();
  const doc = {
    ...buildPayload(req.body),
    status: EQUIPMENT_STATUS.PENDING,
    ownerId: req.user.id,
    ownerName: req.user.name,
    ownerEmail: req.user.email,
    ownerPhoto: req.user.image,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await col.equipment().insertOne(doc);
  res.status(201).json({ ...doc, _id: insertedId });
});

async function loadEditable(req) {
  const _id = toObjectId(req.params.id);
  const item = await col.equipment().findOne({ _id });
  if (!item) throw new ApiError(404, "Equipment not found");
  if (req.user.role === ROLES.OWNER && item.ownerId !== req.user.id)
    throw new ApiError(403, "You can only manage your own equipment");
  return item;
}

export const updateEquipment = asyncHandler(async (req, res) => {
  const item = await loadEditable(req);
  const set = { ...buildPayload(req.body), updatedAt: new Date() };
  // owner edits go back to review; admin edits keep the current status
  if (req.user.role === ROLES.OWNER) set.status = EQUIPMENT_STATUS.PENDING;
  await col.equipment().updateOne({ _id: item._id }, { $set: set });
  res.json({ ...item, ...set });
});

export const deleteEquipment = asyncHandler(async (req, res) => {
  const item = await loadEditable(req);
  await Promise.all([
    col.equipment().deleteOne({ _id: item._id }),
    col.favorites().deleteMany({ equipmentId: item._id.toString() }),
  ]);
  res.json({ message: "Equipment deleted" });
});

export const setEquipmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!Object.values(EQUIPMENT_STATUS).includes(status)) throw new ApiError(400, "Invalid status");
  const result = await col.equipment().updateOne({ _id: toObjectId(req.params.id) }, { $set: { status, updatedAt: new Date() } });
  if (!result.matchedCount) throw new ApiError(404, "Equipment not found");
  res.json({ message: `Equipment ${status}` });
});
