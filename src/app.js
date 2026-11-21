import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import routes from "./routes/index.js";
import { stripeWebhook } from "./controllers/payment.controller.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, cb) => (!origin || env.clientUrls.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
    credentials: true,
  })
);
if (env.nodeEnv !== "production") app.use(morgan("dev"));

// lazy DB connection - works on long-running servers and on serverless
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Stripe needs the raw body, so it is mounted before express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({ name: "RigRent API", status: "running" }));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
