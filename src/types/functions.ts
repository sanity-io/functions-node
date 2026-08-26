import type {FunctionContext, GenericContext, ScheduledFunctionContext, SyncTagInvalidateContext} from './context'

/**
 * Callback provided by Sanity CLI when doing local development.
 *
 * The CLI receives the event data alone: it delivers it to the target function as
 * `event.data` and derives the target's context from the calling function's own context.
 */
export type InvokeCallback = <T = unknown>(name: string, payload?: Record<string, unknown>, options?: InvokeOptions) => Promise<T>

/**
 * Options provided to invoke
 */
export type InvokeOptions = {
  // Whether the function should be invoked synchronously
  sync?: boolean
}

/**
 * The event object received by the function handler in the case of a document event,
 * such as a publish, unpublish, delete or mutation event and similar.
 */
export interface DocumentEvent<IData = any> {
  /**
   * The data delivered to the function. This is the result of applying any configured
   * GROQ-projection to the changed document. If no projection is configured, this is
   * the document itself.
   */
  data: IData
}

/**
 * The event object received by the function handler in the case of a sync-tag-invalidate event.
 */
export interface SyncTagInvalidateEvent {
  /**
   * The sync tags for use with cache invalidation and notifying the callback endpoint once tags are invalidated.
   */
  data: {
    /** Array of sync tags to be invalidated. */
    syncTags: string[]
  }
}

/**
 * A function handler for a document event.
 */
export type DocumentEventHandler<IData = any> = (envelope: {context: FunctionContext; event: DocumentEvent<IData>}) => void | Promise<void>

/**
 * A function handler for a schedule event.
 */
export type ScheduledEventHandler = (envelope: {context: ScheduledFunctionContext}) => void | Promise<void>

/**
 * A generic function event type which supports all function types
 */
export type GenericEvent = DocumentEvent | SyncTagInvalidateEvent

/**
 * A function handler for a pubsub event.
 *
 * A pubsub function can be triggered by any event source, so the envelope is intentionally
 * permissive and needs no narrowing: `context` is any supported context, `event` is any
 * supported event, and `done` is optional (present only for sync-tag-invalidate events).
 *
 * `IResult` is the value the handler resolves to and defaults to `void`. Pubsub is the one
 * function type that may be invoked with {@link invoke | `invoke(name, payload, {sync: true})`},
 * which returns the handler's resolved value to the caller.
 */
export type PubSubEventHandler<IData = any, IResult = void> = (envelope: {
  context: GenericContext
  event: DocumentEvent<IData> | SyncTagInvalidateEvent
  done?: SyncTagInvalidateCallback
}) => IResult | Promise<IResult>

/**
 * A generic function handler that can receive the payload of any function type.
 *
 * @deprecated Renamed to {@link PubSubEventHandler}. This alias will be removed in the next
 * major version.
 */
export type EventHandler<IData = any, IResult = void> = PubSubEventHandler<IData, IResult>

/**
 * A callback function to invoke once a sync-tag-invalidate event has been processed. Signals to Sanity that sync tag invalidation has completed.
 */
export type SyncTagInvalidateCallback = (syncTags: string[]) => Promise<Response>

/**
 * A function handler for a sync-tag-invalidate event.
 */
export type SyncTagInvalidateEventHandler = (envelope: {
  context: SyncTagInvalidateContext
  event: SyncTagInvalidateEvent
  done: SyncTagInvalidateCallback
}) => void | Promise<void>

/**
 * The payload for the `invoke` method
 */
export type FunctionPayload = {
  event: GenericEvent
  context: GenericContext
}

/**
 * The definition of a function resource in our resource discovery table
 */
export type FunctionResource = {
  logicalResourceId: string
  physicalResourceId: string
}

type FunctionResourceKey = 'eventsourcemapping' | 'function' | 'parameter' | 'queue' | 'schedule' | 'subscription' | 'topic'

export type FunctionResourceEnvelope = {
  [K in FunctionResourceKey]-?: {[P in K]: FunctionResource} & {[P in Exclude<FunctionResourceKey, K>]?: FunctionResource}
}[FunctionResourceKey]
