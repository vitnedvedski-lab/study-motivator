import { PeriodType } from '../types';

const pad = (value: number) => String(value).padStart(2, '0');

export const formatDateISO = (date: Date): string =>
  `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;

export const formatDateDisplay = formatDateISO;

export const formatDateId = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseISODate = (value: string): Date | null => {
  const normalized = value.trim();
  const displayMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(normalized);
  if (displayMatch) {
    const date = new Date(Number(displayMatch[3]), Number(displayMatch[2]) - 1, Number(displayMatch[1]));
    return formatDateDisplay(date) === normalized ? date : null;
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return formatDateId(date) === normalized ? date : null;
  }

  return null;
};

export const normalizeDateDisplay = (value?: string | null): string => {
  if (!value) return '';
  const parsed = parseISODate(value);
  return parsed ? formatDateDisplay(parsed) : value;
};

export const maskDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

export const compareDateStrings = (a: string, b: string): number => {
  const left = parseISODate(a)?.getTime() ?? 0;
  const right = parseISODate(b)?.getTime() ?? 0;
  return left - right;
};

export const shiftDateString = (value: string, days: number): string => {
  const date = parseISODate(value) ?? new Date();
  date.setDate(date.getDate() + days);
  return formatDateDisplay(date);
};

export const addPeriod = (startDate: string, periodType: PeriodType): string => {
  const start = parseISODate(startDate) ?? new Date();
  const end = new Date(start);

  switch (periodType) {
    case 'week':
      end.setDate(end.getDate() + 6);
      break;
    case 'month':
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'quarter':
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      break;
    case 'semester':
      end.setMonth(end.getMonth() + 6);
      end.setDate(end.getDate() - 1);
      break;
    case 'year':
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      break;
  }

  return formatDateISO(end);
};
