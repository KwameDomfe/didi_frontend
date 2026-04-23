// Simple currency formatter utility
export default function formatCurrency(amount, currency = 'GHC', locale = 'en-GH') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
