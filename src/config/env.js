import "dotenv/config";

const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB || "rigrent",
  clientUrls: list(process.env.CLIENT_URL || "http://localhost:3000"),
  authJwksUrl: process.env.AUTH_JWKS_URL || "http://localhost:3000/api/auth/jwks",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  cronSecret: process.env.CRON_SECRET,
  enableCron: process.env.ENABLE_CRON !== "false",
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || "RigRent <no-reply@rigrent.com>",
  },
};

if (!env.mongoUri) throw new Error("MONGODB_URI is not defined in environment variables");
