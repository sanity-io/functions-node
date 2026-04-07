/**
 * The context object passed to the function handler.
 *
 * @beta
 */
export interface FunctionContext {
  /** The resource type of the event source; resource type that invoked the function. */
  eventResourceType: string
  /** The resource ID of the event source; resource ID that invoked the function. */
  eventResourceId: string
  /** The resource type of the function container; resource type that houses the function. */
  functionResourceType: string
  /** The resource ID of the function container; resource ID that houses the function. */
  functionResourceId: string
  /**
   * `local` is set to `true` when testing your function locally.
   * i.e. `sanity function test func-name`
   * Otherwise, the property is not set.
   */
  local?: boolean
  /**
   * Options that can be passed to a `@sanity/client` constructor to configure it
   * against the project and dataset which triggered the event. Note that you should
   * always specify an explicit `apiVersion` in YYYY-MM-DD format (e.g. `2025-05-01`).
   *
   * @example
   * Constructing a client with the options from the context:
   * ```ts
   * const client = createClient({
   *   apiVersion: '2025-05-01',
   *   ...context.clientOptions,
   * })
   * ```
   * @beta
   */
  clientOptions: {
    apiHost?: string
    dataset: string
    projectId: string
    token: string
  }
}

/**
 * The context object passed to the schedule function handler.
 *
 * @beta
 */
export interface ScheduledFunctionContext {
  /**
   * `local` is set to `true` when testing your function locally.
   * i.e. `sanity function test func-name`
   * Otherwise, the property is not set.
   */
  local?: boolean
  /**
   * Options that can be passed to a `@sanity/client` constructor to configure it
   * against the project and dataset which triggered the event. Note that you should
   * always specify an explicit `apiVersion` in YYYY-MM-DD format (e.g. `2025-05-01`).
   *
   * @example
   * Constructing a client with the options from the context:
   * ```ts
   * const client = createClient({
   *   apiVersion: '2025-05-01',
   *   ...context.clientOptions,
   * })
   * ```
   * @beta
   */
  clientOptions?: {
    apiHost?: string
    dataset?: string
    projectId?: string
    token?: string
  }
}

/**
 * The event object received by the function handler in the case of a document event,
 * such as a publish, unpublish, delete or mutation event and similar.
 *
 * @beta
 */
export interface DocumentEvent<IData = any> {
  /**
   * The data delivered to the function. This is the result of applying any configured
   * GROQ-projection to the changed document. If no projection is configured, this is
   * the document itself.
   *
   * @beta
   */
  data: IData
}

/**
 * The event object received by the function handler in the case of a sync-tag-invalidate event.
 *
 * @beta
 */
export interface SyncTagInvalidateEvent {
  /**
   * The sync tags for use with cache invalidation and notifying the callback endpoint once tags are invalidated.
   *
   * @beta
   */
  data: {
    /** Array of sync tags to be invalidated. */
    syncTags: string[]
  }
}

/**
 * A function handler for a document event.
 *
 * @beta
 */
export type DocumentEventHandler<IData = any> = (envelope: {context: FunctionContext; event: DocumentEvent<IData>}) => void | Promise<void>

/**
 * A function handler for a schedule event.
 *
 * @beta
 */
export type ScheduledEventHandler = (envelope: {context: ScheduledFunctionContext}) => void | Promise<void>

/**
 * A callback function to invoke once a sync-tag-invalidate event has been processed. Signals to Sanity that sync tag invalidation has completed.
 *
 * @beta
 */
export type SyncTagInvalidateCallback = (syncTags: string[]) => Promise<Response>

/**
 * The context object passed to the sync tag invalidate event handler.
 *
 * @beta
 */
export interface SyncTagInvalidateContext extends Omit<FunctionContext, 'clientOptions'> {
  /**
   * A short-lived token that should be used to notify Sanity of sync tag invalidation routine completion. Recommended to use the `done` helper argument provided to the sync tag invalidate event handler instead of this token directly.
   */
  callbackToken: string
  clientOptions: {
    apiHost: string
    dataset: string
    projectId: string
    /**
     * An API token for use with the Sanity HTTP API. Note that it may be undefined if the user does not explicitly assign a Robot Token to their function definition.
     * @see https://www.sanity.io/docs/blueprints/blueprints-robot-tokens#k8a2a6a24a5c0
     */
    token?: string
  }
}
/**
 * A function handler for a sync-tag-invalidate event.
 *
 * @beta
 */
export type SyncTagInvalidateEventHandler = (envelope: {
  context: SyncTagInvalidateContext
  event: SyncTagInvalidateEvent
  done: SyncTagInvalidateCallback
}) => void | Promise<void>
