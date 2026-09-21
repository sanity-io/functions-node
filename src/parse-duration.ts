import parse from 'parse-duration'

type DurationUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'mo' | 'y'

const YEAR_IN_SEC = 31_536_000
const YEAR_IN_MS = YEAR_IN_SEC * 1000
const units = parse.unit as Record<string, number>

// Extend the units object because of the calculations of parse-duration of year to secs - `31557600000`
Object.assign(units, {
  year: YEAR_IN_MS,
  yr: YEAR_IN_MS,
  y: YEAR_IN_MS,

  month: YEAR_IN_MS / 12,
  mth: YEAR_IN_MS / 12,
  mo: YEAR_IN_MS / 12,

  week: YEAR_IN_MS / 52,
  wk: YEAR_IN_MS / 52,
  w: YEAR_IN_MS / 52,
})

export const parseDuration = (duration: string | number, unit: DurationUnit = 's'): number => {
  const parsed = typeof duration === 'number' ? duration : parse(duration, unit)

  if (parsed === null || !Number.isFinite(parsed)) {
    throw new Error(`Invalid duration: ${duration}`)
  }

  return parsed
}
