import type {DurableHandler} from './types/durables.js'

/**
 * Determine if `createDurable({}, () => {})` or `createDurable(() => {})`.
 * @param configOrHandler
 * @param maybeHandler
 * @returns resolved arguments
 */
const resolveFuncArgs = <TConfig extends {name: string}>(
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
 * @returns The handler function, unmodified.
 */
export function createDurable(handler: DurableHandler): DurableHandler & {config?: undefined}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durables are an experimental feature and may change in the future.
 * @hidden
 * @param config
 * @param handler
 * @returns  The handler function, unmodified and the provided config object.
 */
export function createDurable<TConfig extends {name: string}>(config: TConfig, handler: DurableHandler): DurableHandler & {config: TConfig}

/**
 * Durables creation function that can be called with or without a config object.
 * @alpha Durable functions are an experimental feature and may change in the future.
 * @hidden
 * @public
 * @param configOrHandler
 * @param maybeHandler
 * @returns The handler function, unmodified and the config object if provided
 */
export function createDurable<TConfig extends {name: string}>(
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
export const durable = {createDurable}
