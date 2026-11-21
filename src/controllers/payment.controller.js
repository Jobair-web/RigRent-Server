import { env } from "../config/env.js";
import { getStripe } from "../config/stripe.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { finalizePaidSession } from "../services/booking.service.js";

/** Called by the success page: verifies the Checkout session and records the payment. */
export const confirmPayment = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) throw new ApiError(400, "sessionId is required");
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.customerId !== req.user.id) throw new ApiError(403, "This payment does not belong to you");
  const booking = await finalizePaidSession(session);
  if (!booking) throw new ApiError(402, "Payment has not been completed");
  res.json({ booking, transactionId: session.payment_intent });
});

/** Optional safety net - register this URL in the Stripe dashboard (checkout.session.completed). */
export const stripeWebhook = asyncHandler(async (req, res) => {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) return res.status(200).json({ received: false });
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.headers["stripe-signature"], env.stripeWebhookSecret);
  } catch {
    throw new ApiError(400, "Invalid webhook signature");
  }
  if (event.type === "checkout.session.completed") await finalizePaidSession(event.data.object);
  res.json({ received: true });
});
