import type {PipelineHandler} from './types'

/**
 * Determine if `createPipeline({}, () => {})` or `createPipeline(() => {})`.
 * @param configOrHandler
 * @param maybeHandler
 * @returns resolved arguments
 */
const resolveFuncArgs = <TConfig extends {name: string}>(
  configOrHandler: TConfig | PipelineHandler,
  maybeHandler?: PipelineHandler,
): {config?: TConfig; handler?: PipelineHandler; hadConfigArg: boolean} => {
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
 * Pipeline creation function that can be called with or without a config object.
 * @alpha Pipelines are an experimental feature and may change in the future.
 * @hidden
 * @param  handler
 * @returns The handler function, unmodified.
 */
export function createPipeline(handler: PipelineHandler): PipelineHandler & {config?: undefined}

/**
 * Pipeline creation function that can be called with or without a config object.
 * @alpha Pipelines are an experimental feature and may change in the future.
 * @hidden
 * @param config
 * @param handler
 * @returns  The handler function, unmodified and the provided config object.
 */
export function createPipeline<TConfig extends {name: string}>(
  config: TConfig,
  handler: PipelineHandler,
): PipelineHandler & {config: TConfig}

/**
 * Pipeline creation function that can be called with or without a config object.
 * @alpha Pipelines are an experimental feature and may change in the future.
 * @hidden
 * @public
 * @param configOrHandler
 * @param maybeHandler
 * @returns The handler function, unmodified and the config object if provided
 */
export function createPipeline<TConfig extends {name: string}>(
  configOrHandler: TConfig | PipelineHandler,
  maybeHandler?: PipelineHandler,
): PipelineHandler {
  const {config, handler, hadConfigArg} = resolveFuncArgs(configOrHandler, maybeHandler)
  const errors = [
    ...(hadConfigArg ? validateConfig(config) : []),
    ...(typeof handler !== 'function' ? ['`handler` must be a function'] : []),
  ]

  if (errors.length > 0) {
    throw new TypeError(errors.join(', '))
  }
  // Separate config from the handler during build
  return Object.assign(handler as PipelineHandler, {config})
}

/**
 * @alpha Pipelines are an experimental feature and may change in the future.
 * @hidden
 * @public
 */
export const pipeline = {createPipeline}
