import parse from 'parse-duration'
import type {DurableDuration, DurableHandler} from './types/durables.js'

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

/**
 * Parses a duration string or number into a number in the specified unit.
 * @param duration
 * @param unit
 * @return The parsed duration in the specified unit.
 */
export const parseDuration = (duration: string | number, unit: DurationUnit = 's'): number => {
  const parsed = typeof duration === 'number' ? duration : parse(duration, unit)

  if (parsed === null || !Number.isFinite(parsed)) {
    throw new Error(`Invalid duration: ${duration}`)
  }

  return parsed
}

/**
 * Converts a delay string into an aws like delay object with keys as DelayUnits and values as numbers.
 * @param delay
 * @return A normalized delay object with keys as DelayUnits and values as numbers.
 * @throws Error if the delay string contains invalid units.
 */
export const normalizeDelay = (delay: string): Partial<DurableDuration> => {
  const tokens = delay.trim().split(/\s+/)
  const result: Record<string, number> = {}
  const validUnits = new Set(['days', 'hours', 'minutes', 'seconds'])

  for (let i = 0; i < tokens.length; i += 2) {
    const value = Number(tokens[i])
    const unit = tokens[i + 1]
    if (!validUnits.has(unit)) {
      throw new Error(`Invalid delay unit: ${unit}`)
    }
    result[unit] = value
  }

  return result
}

/**
 * Determine if `durableEventHandler({}, () => {})` or `durableEventHandler(() => {})`.
 * @param configOrHandler
 * @param maybeHandler
 * @returns resolved arguments
 */
const resolveFuncArgs = <TConfig extends {name: string; durableTimeout?: string | number}>(
  configOrHandler: TConfig | DurableHandler,
  maybeHandler?: DurableHandler,
): {config?: TConfig; handler?: DurableHandler; hadConfigArg: boolean} => {
  return typeof configOrHandler === 'function'
    ? {config: undefined, handler: configOrHandler, hadConfigArg: false}
    : {config: configOrHandler, handler: maybeHandler, hadConfigArg: true}
}

/**
 * Validates the config to ensure config contains proper elements
 * @param config
 * @returns Errors while validating a config object
 */
const validateConfig = (config: unknown) => {
  const EVENT_TYPES = ['document', 'media-library', 'cron', 'sync-tag-invalidate']
  const errors: string[] = []

  if (config === undefined || config === null) {
    errors.push('`config` must be defined')
    return errors
  }
  if (typeof config !== 'object') {
    errors.push('`config` must be an object')
    return errors
  }

  const name = 'name' in config ? config.name : undefined
  const event = 'event' in config ? config.event : undefined
  if (typeof name !== 'string') errors.push('`config.name` must be a string')

  if ('durableTimeout' in config) {
    const duration = typeof config.durableTimeout === 'string' ? parseDuration(config.durableTimeout, 's') : config.durableTimeout
    if (typeof duration === 'number') {
      if (duration < 60) {
        errors.push('`config.durableTimeout` must be at least 60 seconds')
      }

      if (duration > 31_536_000) {
        errors.push('`config.durableTimeout` must be at most 1 year')
      }
    }
  }

  if ('event' in config) {
    if (typeof event !== 'object' || event === null) {
      errors.push('`event` must be an object')
    } else if ('type' in event) {
      if (typeof event.type !== 'string') {
        errors.push('`event.type` must be defined')
      } else if (!EVENT_TYPES.includes(event.type)) {
        errors.push(`\`event.type\` must be one of: ${EVENT_TYPES.join(', ')}`)
      }
    }
  }
  return errors
}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durables are an experimental feature and may change in the future.
 * @hidden
 * @param  handler
 * @deprecated Use `durableEventHandler` instead
 * @returns The handler function, unmodified.
 */
export function createDurable(handler: DurableHandler): DurableHandler & {config?: undefined}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durables are an experimental feature and may change in the future.
 * @hidden
 * @param config
 * @param handler
 * @deprecated Use `durableEventHandler` instead
 * @returns  The handler function, unmodified and the provided config object.
 */
export function createDurable<TConfig extends {name: string; durableTimeout?: string | number}>(
  config: TConfig,
  handler: DurableHandler,
): DurableHandler & {config: TConfig}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durable functions are an experimental feature and may change in the future.
 * @hidden
 * @public
 * @param configOrHandler
 * @param maybeHandler
 * @deprecated Use `durableEventHandler` instead
 * @returns The handler function, unmodified and the config object if provided
 */
export function createDurable<TConfig extends {name: string; durableTimeout?: string | number}>(
  configOrHandler: TConfig | DurableHandler,
  maybeHandler?: DurableHandler,
): DurableHandler {
  const {config, handler, hadConfigArg} = resolveFuncArgs(configOrHandler, maybeHandler)
  const errors = [
    ...(hadConfigArg ? validateConfig(config) : []),
    ...(typeof handler !== 'function' ? ['`handler` must be a function'] : []),
  ]

  if (errors.length > 0) {
    throw new TypeError(errors.join(', '))
  }
  // Separate config from the handler during build
  return Object.assign(handler as DurableHandler, {config})
}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durables are an experimental feature and may change in the future.
 * @hidden
 * @param  handler
 * @returns The handler function, unmodified.
 */
export function durableEventHandler(handler: DurableHandler): DurableHandler & {config?: undefined}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durables are an experimental feature and may change in the future.
 * @hidden
 * @param config
 * @param handler
 * @returns  The handler function, unmodified and the provided config object.
 */
export function durableEventHandler<TConfig extends {name: string; durableTimeout?: string | number}>(
  config: TConfig,
  handler: DurableHandler,
): DurableHandler & {config: TConfig}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durable functions are an experimental feature and may change in the future.
 * @hidden
 * @public
 * @param configOrHandler
 * @param maybeHandler
 * @returns The handler function, unmodified and the config object if provided
 */
export function durableEventHandler<TConfig extends {name: string; durableTimeout?: string | number}>(
  configOrHandler: TConfig | DurableHandler,
  maybeHandler?: DurableHandler,
): DurableHandler {
  const {config, handler, hadConfigArg} = resolveFuncArgs(configOrHandler, maybeHandler)
  const errors = [
    ...(hadConfigArg ? validateConfig(config) : []),
    ...(typeof handler !== 'function' ? ['`handler` must be a function'] : []),
  ]

  if (errors.length > 0) {
    throw new TypeError(errors.join(', '))
  }
  // Separate config from the handler during build
  return Object.assign(handler as DurableHandler, {config})
}

/**
 * @alpha Durable functions are an experimental feature and may change in the future.
 * @hidden
 * @public
 */
export const durable = {durableEventHandler, createDurable}
