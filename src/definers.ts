import type { DocumentEventHandler, ScheduleEventHandler } from './types.js'

/**
 * Defines a "document event" function handler.
 * Returns the handler function as-is, only providing the types and doing basic validation.
 *
 * @param handler - The event handler function to use.
 * @returns The handler function, unmodified.
 */
export function documentEventHandler<IData = any>(handler: DocumentEventHandler<IData>): DocumentEventHandler<IData> {
  if (typeof handler !== 'function') throw new TypeError('`handler` must be a function')
  return handler
}

/**
 * Defines a "scheduled event" function handler.
 * Returns the handler function as-is, only providing the types and doing basic validation.
 *
 * @beta
 * @param handler - The event handler function to use.
 * @returns The handler function, unmodified.
 */
export function scheduleEventHandler(
  handler: ScheduleEventHandler,
): ScheduleEventHandler {
  if (typeof handler !== 'function') throw new TypeError('`handler` must be a function')
  return handler
}
