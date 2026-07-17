import type { PipelineHandler } from "./types";

/**
 *
 * @param {TConfig} config
 * @param {PipelineHandler<IData>} handler
 * @returns {PipelineHandler<IData> & {config: TConfig}}
 */
export function createPipeline<TConfig extends {name: string}, IData = any>(
  config: TConfig,
  handler: PipelineHandler<IData>,
): PipelineHandler<IData> & {config: TConfig} {
  if (config !== null)  {
    if (typeof config !== 'object') throw new TypeError('`config` must be an object')
    if (typeof config.name !== 'string') throw new TypeError('`config.name` must be a string')
  }
  if (typeof handler !== 'function') throw new TypeError('`handler` must be a function')
  // This should allow us to separate config from the handler during build time
  return Object.assign(handler, {config})
}

export const pipeline = {createPipeline}