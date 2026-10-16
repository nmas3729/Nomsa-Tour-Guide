export function formatCurrency(
  amount: number | string,
  currency = "ZAR",
  locale = "en-ZA",
): string {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(numericAmount)) {
    throw new RangeError("Currency amount must be a finite number.");
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale = "en-ZA",
): string {
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new RangeError("Date must be valid.");
  }
  return new Intl.DateTimeFormat(locale, options).format(parsedDate);
}

export function formatPhone(phone: string, countryCode = "+27"): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const localDigits = digits.startsWith("27") ? digits.slice(2) : digits.replace(/^0/, "");
  const southAfricanNumber = localDigits.match(/^(\d{2})(\d{3})(\d{4})$/);
  const groups = southAfricanNumber
    ? [southAfricanNumber[1], southAfricanNumber[2], southAfricanNumber[3]]
    : localDigits.match(/.{1,3}/g) ?? [];
  return `${countryCode} ${groups.join(" ")}`.trim();
}
