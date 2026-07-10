export const DEFAULT_CURRENCY = "USD";

export function formatMoney(value: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatMoneyCompact(value: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
