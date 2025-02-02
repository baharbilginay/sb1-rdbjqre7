// Configure timezone for date formatting
const turkishTimeZone = 'Europe/Istanbul';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('tr-TR', {
    timeZone: turkishTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('tr-TR', {
    timeZone: turkishTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatShortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    timeZone: turkishTimeZone
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('tr-TR', {
    timeZone: turkishTimeZone,
    hour: '2-digit',
    minute: '2-digit'
  });
}