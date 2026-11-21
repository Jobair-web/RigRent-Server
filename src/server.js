import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startBookingCron } from "./jobs/booking.job.js";

await connectDB();
app.listen(env.port, () => console.log(`RigRent API listening on http://localhost:${env.port}`));
if (env.enableCron) startBookingCron();
