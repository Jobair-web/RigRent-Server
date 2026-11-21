import { asyncHandler } from "../utils/asyncHandler.js";
import { getAdminAnalytics, getOwnerAnalytics } from "../services/analytics.service.js";

export const adminAnalytics = asyncHandler(async (_req, res) => res.json(await getAdminAnalytics()));
export const ownerAnalytics = asyncHandler(async (req, res) => res.json(await getOwnerAnalytics(req.user.id)));
