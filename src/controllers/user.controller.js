import { col, getDB } from "../config/db.js";
import { ROLES } from "../constants/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex, getPagination, paginated } from "../utils/pagination.js";
import { toObjectId } from "../utils/objectId.js";

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  image: u.image || "",
  phone: u.phone || "",
  address: u.address || "",
  role: u.role || ROLES.CUSTOMER,
  createdAt: u.createdAt,
});

export const getMe = asyncHandler(async (req, res) => {
  res.json(publicUser(await col.users().findOne({ email: req.user.email })));
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, image = "", phone = "", address = "" } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Name is required");
  await col.users().updateOne(
    { email: req.user.email },
    { $set: { name: name.trim(), image: image.trim(), phone: phone.trim(), address: address.trim(), updatedAt: new Date() } }
  );
  res.json(publicUser(await col.users().findOne({ email: req.user.email })));
});

export const listUsers = asyncHandler(async (req, res) => {
  const pg = getPagination(req.query, 10);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search?.trim()) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    col.users().find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).toArray(),
    col.users().countDocuments(filter),
  ]);
  res.json(paginated(users.map(publicUser), total, pg));
});

export const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) throw new ApiError(400, "Invalid role");
  const _id = toObjectId(req.params.id);
  if (_id.toString() === req.user.id) throw new ApiError(400, "You cannot change your own role");
  const result = await col.users().updateOne({ _id }, { $set: { role, updatedAt: new Date() } });
  if (!result.matchedCount) throw new ApiError(404, "User not found");
  res.json({ message: `Role changed to ${role}` });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const _id = toObjectId(req.params.id);
  if (_id.toString() === req.user.id) throw new ApiError(400, "You cannot delete your own account");
  const result = await col.users().deleteOne({ _id });
  if (!result.deletedCount) throw new ApiError(404, "User not found");
  // clean up Better Auth sessions / accounts (userId may be stored as ObjectId or string)
  const db = getDB();
  const match = { userId: { $in: [_id, _id.toString()] } };
  await Promise.all([db.collection("session").deleteMany(match), db.collection("account").deleteMany(match)]);
  res.json({ message: "User deleted" });
});
