import { formatIndianCurrency, formatIndianNumber, parseIndianNumber } from './indianCurrency';

export { formatIndianCurrency, formatIndianNumber, parseIndianNumber };

export const formatCurrency = (amount: number | string | null | undefined, showDecimals = false): string => {
  return formatIndianCurrency(amount, { showDecimals });
};

export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const formatDateTime = (dateString?: string | Date): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};
