import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { col } from "../config/db.js";
import { ROLES } from "../constants/index.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Public keys are published by Better Auth (jwt plugin) on the Next.js app.
const JWKS = createRemoteJWKSet(new URL(env.authJwksUrl));

/** Verifies the Bearer JWT, then loads the user so roles are always up to date. */
export const verifyToken = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Authentication token missing");

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS));
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await col.users().findOne({ email: payload.email });
  if (!user) throw new ApiError(401, "User not found");

  req.user = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    image: user.image || "",
    phone: user.phone || "",
    address: user.address || "",
    role: user.role || ROLES.CUSTOMER,
  };
  next();
});

const allow = (...roles) => [
  verifyToken,
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Forbidden: you do not have permission for this action");
    }
    next();
  },
];

export const verifyRenter = allow(ROLES.CUSTOMER);
export const verifyOwner = allow(ROLES.OWNER);
export const verifyAdmin = allow(ROLES.ADMIN);
export const verifyOwnerOrAdmin = allow(ROLES.OWNER, ROLES.ADMIN);
