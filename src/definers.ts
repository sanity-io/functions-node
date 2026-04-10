import type {DocumentEventHandler, ScheduledEventHandler, SyncTagInvalidateEventHandler} from './types.js'

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
 * @alpha
 * @hidden
 * @param handler - The event handler function to use.
 * @returns The handler function, unmodified.
 */
export function scheduledEventHandler(handler: ScheduledEventHandler): ScheduledEventHandler {
  if (typeof handler !== 'function') throw new TypeError('`handler` must be a function')
  return handler
}

/**
 * Defines a "sync tag invalidate event" function handler.
 * Returns the handler function as-is, only providing the types and doing basic validation.
 *
 * @param handler - The event handler function to use.
 * @returns The handler function, unmodified.
 */
export function syncTagInvalidateEventHandler(handler: SyncTagInvalidateEventHandler): SyncTagInvalidateEventHandler {
  if (typeof handler !== 'function') throw new TypeError('`handler` must be a function')
  return handler
}
