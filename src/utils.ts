import parse from 'parse-duration'
import type {DurableDuration} from './types/durables.js'

type DurationUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'mo' | 'y'

const YEAR_IN_SEC = 31_536_000
const YEAR_IN_MS = YEAR_IN_SEC * 1000
const MAX_DURATION_SEC = 31_622_400

// Extend the units object because of the calculations of parse-duration of year to secs - `31557600000`
const AWS_UNITS = Object.assign(Object.create(null), parse.unit, {
  year: YEAR_IN_MS,
  yr: YEAR_IN_MS,
  y: YEAR_IN_MS,

  month: YEAR_IN_MS / 12,
  mth: YEAR_IN_MS / 12,
  mo: YEAR_IN_MS / 12,
})

/**
 * Parses a duration string or number into a number in the specified unit.
 * @param duration
 * @param unit
 * @return The parsed duration in the specified unit.
 */
export const parseDuration = (duration: string | number, unit: DurationUnit = 's'): number => {
  const resetParser = parse.unit
  ;(parse.unit as Record<string, number>) = AWS_UNITS
  try {
    const parsed = typeof duration === 'number' ? duration : parse(duration, unit)

    if (parsed === null || !Number.isFinite(parsed)) {
      throw new TypeError(`Invalid duration: ${duration}`)
    }

    return parsed
  } finally {
    parse.unit = resetParser
  }
}

/**
 * Converts a delay string into an aws like delay object with keys as DelayUnits and values as numbers.
 * @param delay
 * @return A normalized delay object with keys as DelayUnits and values as numbers.
 * @throws Error if the delay string contains invalid units.
 */
export const normalizeDelay = (delay: string | Partial<DurableDuration> | number): Partial<DurableDuration> => {
  // just return the normalized object
  if (delay && typeof delay === 'object') {
    return delay
  }

  // If number, assume seconds.
  // converts everything to 'ms'
  let duration = typeof delay === 'number' ? delay * 1000 : parseDuration(delay, 'ms')
  // Catch anything that isn't a whole number
  if (!Number.isFinite(duration) && duration % 1000 !== 0) {
    throw new Error('Duration must be a whole number greater then or equal to 1 second')
  }

  if (duration < 1000) {
    throw new Error('Duration must be greater than or equal to 1 second')
  }

  if (duration > MAX_DURATION_SEC * 1000) {
    throw new Error('Duration cannot be longer then 1 year (31_622_400 seconds)')
  }

  const result: Record<string, number> = {}

  // convert final results to the proper duration units
  for (const [key, unit] of [
    ['days', 'd'],
    ['hours', 'h'],
    ['minutes', 'm'],
    ['seconds', 's'],
  ] as const) {
    const value = Math.floor(duration / AWS_UNITS[unit])
    if (value) result[key] = value
    duration -= value * AWS_UNITS[unit]
  }

  return result
}
