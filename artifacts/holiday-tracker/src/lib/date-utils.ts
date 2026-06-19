import { format, parse, parseISO } from "date-fns";

/**
 * Returns YYYY-MM-DD from a local Date object
 */
export const formatLocalDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

/**
 * Parses YYYY-MM-DD to a local Date object safely at midnight
 */
export const parseLocalDate = (dateStr: string): Date => {
  return parse(dateStr, "yyyy-MM-dd", new Date(new Date().setHours(0,0,0,0)));
};

export const getMonthBounds = (year: number, month: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
};
