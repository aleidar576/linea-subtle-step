import { startOfDay, endOfDay, subDays } from 'date-fns';

export type PeriodoRange = 'hoje' | 'ontem' | '7d' | '30d' | 'month' | 'all' | 'custom';

export function getStoreDateRange(periodo: PeriodoRange, dateFrom?: Date, dateTo?: Date) {
  const now = new Date();

  switch (periodo) {
    case 'hoje':
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case 'ontem': {
      const y = subDays(now, 1);
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
    }
    case '7d':
      return { from: startOfDay(subDays(now, 7)).toISOString(), to: endOfDay(now).toISOString() };
    case '30d':
      return { from: startOfDay(subDays(now, 30)).toISOString(), to: endOfDay(now).toISOString() };
    case 'month':
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString(), to: endOfDay(now).toISOString() };
    case 'custom':
      return {
        from: dateFrom ? startOfDay(dateFrom).toISOString() : undefined,
        to: dateTo ? endOfDay(dateTo).toISOString() : undefined,
      };
    case 'all':
    default:
      return { from: undefined, to: undefined };
  }
}
