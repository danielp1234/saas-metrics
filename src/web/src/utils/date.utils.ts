/**
 * @fileoverview Date utility functions for the SaaS metrics platform
 * Provides comprehensive date manipulation, formatting, validation, and timezone handling
 * @version 1.0.0
 */

// External imports - date-fns v2.30.0
import { 
  format, 
  parseISO, 
  isValid, 
  isAfter, 
  isBefore, 
  differenceInDays 
} from 'date-fns';

// External imports - date-fns-tz v2.0.0
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Global constants for date formatting and validation
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'MMM dd, yyyy';
export const DISPLAY_DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const DEFAULT_TIMEZONE = 'UTC';
export const MAX_DATE_RANGE_DAYS = 365 * 7; // 7 years maximum range

/**
 * Interface for date range calculation results
 */
interface DateRange {
  start: Date;
  end: Date;
  days: number;
  isValid: boolean;
}

/**
 * Formats a date string or Date object to the standard application format
 * @param date - Input date as string or Date object
 * @param formatStr - Optional format string (defaults to DATE_FORMAT)
 * @param timezone - Optional timezone (defaults to DEFAULT_TIMEZONE)
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  date: string | Date,
  formatStr?: string,
  timezone?: string
): string => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return '';
    }

    const zonedDate = timezone 
      ? toZonedTime(parsedDate, timezone)
      : toZonedTime(parsedDate, DEFAULT_TIMEZONE);

    return format(zonedDate, formatStr || DATE_FORMAT);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Formats a date for user-friendly display with optional time component
 * @param date - Input date as string or Date object
 * @param includeTime - Whether to include time in the output
 * @param timezone - Optional timezone (defaults to DEFAULT_TIMEZONE)
 * @returns User-friendly formatted date string
 */
export const formatDateForDisplay = (
  date: string | Date,
  includeTime = false,
  timezone?: string
): string => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return 'Invalid date';
    }

    const zonedDate = timezone 
      ? toZonedTime(parsedDate, timezone)
      : toZonedTime(parsedDate, DEFAULT_TIMEZONE);

    const formatString = includeTime ? DISPLAY_DATETIME_FORMAT : DISPLAY_DATE_FORMAT;
    return format(zonedDate, formatString);
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return 'Invalid date';
  }
};

/**
 * Parses a date string into a Date object with timezone handling
 * @param dateStr - Date string to parse
 * @param timezone - Optional timezone (defaults to DEFAULT_TIMEZONE)
 * @returns Parsed Date object or null if invalid
 */
export const parseDate = (dateStr: string, timezone?: string): Date | null => {
  try {
    const parsedDate = parseISO(dateStr);
    if (!isValid(parsedDate)) {
      return null;
    }

    return timezone 
      ? toZonedTime(parsedDate, timezone)
      : toZonedTime(parsedDate, DEFAULT_TIMEZONE);
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Validates if a date string or Date object is valid and within acceptable range
 * @param date - Date to validate
 * @param minDate - Optional minimum date boundary
 * @param maxDate - Optional maximum date boundary
 * @returns Boolean indicating if date is valid and within range
 */
export const isValidDate = (
  date: string | Date,
  minDate?: Date,
  maxDate?: Date
): boolean => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return false;
    }

    if (minDate && isBefore(parsedDate, minDate)) {
      return false;
    }

    if (maxDate && isAfter(parsedDate, maxDate)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating date:', error);
    return false;
  }
};

/**
 * Calculates and validates a date range for metrics filtering
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @returns DateRange object with validation status
 */
export const getDateRange = (
  startDate: string | Date,
  endDate: string | Date
): DateRange => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    if (!isValid(start) || !isValid(end)) {
      throw new Error('Invalid date input');
    }

    const days = differenceInDays(end, start);
    
    if (days < 0) {
      throw new Error('End date must be after start date');
    }

    if (days > MAX_DATE_RANGE_DAYS) {
      throw new Error(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
    }

    return {
      start: fromZonedTime(start, DEFAULT_TIMEZONE),
      end: fromZonedTime(end, DEFAULT_TIMEZONE),
      days,
      isValid: true
    };
  } catch (error) {
    console.error('Error calculating date range:', error);
    return {
      start: new Date(),
      end: new Date(),
      days: 0,
      isValid: false
    };
  }
};

/**
 * Converts a local date to UTC with validation
 * @param date - Date to convert
 * @param sourceTimezone - Optional source timezone (defaults to DEFAULT_TIMEZONE)
 * @returns UTC Date object or null if invalid
 */
export const toUTC = (
  date: string | Date,
  sourceTimezone?: string
): Date | null => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return null;
    }

    const timezone = sourceTimezone || DEFAULT_TIMEZONE;
    return fromZonedTime(parsedDate, timezone);
  } catch (error) {
    console.error('Error converting to UTC:', error);
    return null;
  }
};