import Stripe from "stripe";
import { env } from "./env.js";
import { ApiError } from "../utils/ApiError.js";

let stripe;
export function getStripe() {
  if (!env.stripeSecretKey) throw new ApiError(500, "Stripe is not configured on the server");
  stripe ??= new Stripe(env.stripeSecretKey);
  return stripe;
}
