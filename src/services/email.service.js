import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;
const getTransporter = () => {
  if (!env.smtp.host) return null;
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
};

async function send({ to, subject, html }) {
  const t = getTransporter();
  if (!t) return console.log(`[email skipped - SMTP not configured] to=${to} subject="${subject}"`);
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, html });
  } catch (err) {
    console.error("Email failed:", err.message);
  }
}

const wrap = (title, body) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2 style="color:#0B1B34">${title}</h2>${body}<p style="color:#64748b;font-size:12px">RigRent Equipment Rental</p></div>`;

export async function sendBookingCompletedEmails(b) {
  const summary = `<p><b>${b.equipmentName}</b><br/>${b.startDate} to ${b.endDate} &middot; Qty ${b.quantity}<br/>Total: $${b.totalAmount}</p>`;
  await Promise.all([
    send({
      to: b.customerEmail,
      subject: "Your rental is completed",
      html: wrap("Rental completed", `<p>Hi ${b.customerName}, thanks for renting with RigRent.</p>${summary}`),
    }),
    send({
      to: b.ownerEmail,
      subject: "A rental of your equipment is completed",
      html: wrap("Rental completed", `<p>Hi ${b.ownerName}, a booking for your equipment has been completed.</p>${summary}`),
    }),
  ]);
}
