export const todayISO = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (start, end) =>
  Math.round((new Date(end) - new Date(start)) / 86400000) + 1;

/** total = billing units (days / weeks / months) x quantity x price */
export function calcRentalAmount({ rentalType, price, startDate, endDate, quantity }) {
  const days = daysBetween(startDate, endDate);
  if (!(days > 0)) return 0;
  const units =
    rentalType === "weekly" ? Math.ceil(days / 7) : rentalType === "monthly" ? Math.ceil(days / 30) : days;
  return Number((units * price * quantity).toFixed(2));
}
