import type {DocumentEventHandler, PubSubEventHandler, ScheduledEventHandler, SyncTagInvalidateEventHandler} from './types.js'

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

/**
 * Defines a "pubsub event" function handler.
 * Returns the handler function as-is, only providing the types and doing basic validation.
 *
 * The handler's return type is inferred, so a pubsub function can resolve to a value that
 * callers receive from `invoke(name, payload, {sync: true})`.
 *
 * @param handler - The event handler function to use.
 * @returns The handler function, unmodified.
 */
export function pubSubEventHandler<IData = any, IResult = void>(
  handler: PubSubEventHandler<IData, IResult>,
): PubSubEventHandler<IData, IResult> {
  if (typeof handler !== 'function') throw new TypeError('`handler` must be a function')
  return handler
}

/**
 * Defines a "generic" function handler.
 * Returns the handler function as-is, only providing the types and doing basic validation.
 *
 * @deprecated Renamed to {@link pubSubEventHandler}. This alias will be removed in the next
 * major version.
 * @param handler - The event handler function to use.
 * @returns The handler function, unmodified.
 */
export function eventHandler<IData = any, IResult = void>(handler: PubSubEventHandler<IData, IResult>): PubSubEventHandler<IData, IResult> {
  return pubSubEventHandler(handler)
}
