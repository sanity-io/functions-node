import type {PipelineHandler} from './types'

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
 * @returns The handler function, unmodified and the provided config object
 */
export function createPipeline<TConfig extends {name: string}>(
  configOrHandler: TConfig | PipelineHandler,
  maybeHandler?: PipelineHandler,
): PipelineHandler {
  let config: TConfig | undefined
  let handler: PipelineHandler | undefined

  if (typeof configOrHandler === 'function') {
    handler = configOrHandler
  } else {
    config = configOrHandler
    handler = maybeHandler
  }

  if (typeof handler !== 'function') throw new TypeError('`handler` must be a function')
  if (config !== undefined) {
    if (typeof config !== 'object' || config === null) throw new TypeError('`config` must be an object')
    if (typeof config.name !== 'string') throw new TypeError('`config.name` must be a string')
    if ('event' in config) {
      if (typeof config.event !== 'object' || config.event === null) throw new TypeError('`event` must be an object')
    }
  }
  // Separate config from the handler during build time
  return Object.assign(handler, {config})
}

/**
 * @alpha Pipelines are an experimental feature and may change in the future.
 * @hidden
 * @public
 */
export const pipeline = {createPipeline}
