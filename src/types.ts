/**
 * Callback provided by Sanity CLI when doing local development
 */
export type InvokeCallback = <T = unknown>(name: string, payload: FunctionPayload, options?: InvokeOptions) => Promise<T>

/**
 * Options provided to invoke
 */
export type InvokeOptions = {
  // Whether the function should be invoked synchronously
  sync?: boolean
}

/**
 * The context object passed to the function handler.
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
  /** Sanity lineage token */
  lineage?: string | undefined
  /**
   * uniqueId for a pipeline run
   */
  runId?: string
  /**
   * `local` is set to `true` when testing your function locally.
   * i.e. `sanity function test func-name`
   * Otherwise, the property is not set.
   */
  local?: boolean
  invoke?: InvokeCallback
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
   */
  clientOptions: {
    apiHost?: string
    dataset: string
    projectId: string
    token?: string
  }
  /** Resource interface that allows access to Blueprint Resources */
  resources: ResourcesApi
}

/**
 * The context object passed to the schedule function handler.
 */
export interface ScheduledFunctionContext {
  /** Sanity lineage token */
  lineage?: string | undefined
  /**
   * `local` is set to `true` when testing your function locally.
   * i.e. `sanity function test func-name`
   * Otherwise, the property is not set.
   */
  local?: boolean
  invoke?: InvokeCallback
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
   */
  clientOptions?: {
    apiHost?: string
    dataset?: string
    projectId?: string
    token?: string
  }
  /** Resource interface that allows access to Blueprint Resources */
  resources: ResourcesApi
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
 * A generic function context type which supports all function types
 */
export type GenericContext = FunctionContext | ScheduledFunctionContext | SyncTagInvalidateContext

/**
 * A generic function event type which supports all function types
 */
export type GenericEvent = DocumentEvent | SyncTagInvalidateEvent

/**
 * A generic function handler that can receive the payload of any function type.
 *
 * The envelope is intentionally permissive so a single handler can be registered
 * regardless of the event source without narrowing: `context` is any supported
 * context, `event` is any supported event, and `done` is optional (present only
 * for sync-tag-invalidate events).
 */
export type EventHandler<IData = any> = (envelope: {
  context: GenericContext
  event: DocumentEvent<IData> | SyncTagInvalidateEvent
  done?: SyncTagInvalidateCallback
}) => void | Promise<void>

/**
 * A callback function to invoke once a sync-tag-invalidate event has been processed. Signals to Sanity that sync tag invalidation has completed.
 */
export type SyncTagInvalidateCallback = (syncTags: string[]) => Promise<Response>

/**
 * The context object passed to the sync tag invalidate event handler.
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
  /** Resource interface that allows access to Blueprint Resources */
  resources: ResourcesApi
}
/**
 * A function handler for a sync-tag-invalidate event.
 */
export type SyncTagInvalidateEventHandler = (envelope: {
  context: SyncTagInvalidateContext
  event: SyncTagInvalidateEvent
  done: SyncTagInvalidateCallback
}) => void | Promise<void>

/**
 * An interface to describe resources found in a Blueprint
 */
export interface BlueprintResource {
  id: string
  name: string
  type: string
}
export interface ResourcesApi {
  /** Cross-type lookup by name: `context.resources('my-proj')`. */
  (name: string): BlueprintResource | undefined
  /** Flat array of every resource across types. */
  all(): BlueprintResource[]
  /** Iterate every resource: `for (const r of context.resources)`. */
  [Symbol.iterator](): IterableIterator<BlueprintResource>
  /** Type specific lookup by name: `context.cors('my-cors')` */
  cors(name: string): BlueprintResource | undefined
  dataset(name: string): BlueprintResource | undefined
  function(name: string): BlueprintResource | undefined
  project(name: string): BlueprintResource | undefined
  role(name: string): BlueprintResource | undefined
  webhook(name: string): BlueprintResource | undefined
}

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

/**
 * The interface defining the operations available to a pipeline function.
 * These operations are steps that delegate to other functions, and wait for external callbacks.
 * @alpha Using pipeline functions is considered experimental and may change in the future.
 * @public
 * @hidden
 */
export interface PipelineOperations {
  /**
   * Runs a named step. Its result is recorded, so if the workflow re-runs the step
   * is not executed again. Failures are retried on their own.
   * similar to ctx.step()
   * @remarks cannot be nested inside another step
   * @param name - Step name
   * @param fn - function being executed
   * @returns The value returned by the executed function
   */
  run<T>(name: string, fn: () => T | Promise<T>): Promise<T>
  /**
   * Calls another function and awaits its result.
   * similar to ctx.invoke()
   * @remarks cannot be nested inside another step
   * @param name - Step name
   * @param input - Data passed to the called function
   * @returns The value returned by the called function
   */
  delegate<T>(name: string, input?: unknown): Promise<T>

  /**
   * Waits for an external callback
   * similar to ctx.waitForCallback()
   * @remarks cannot be nested inside another step
   * @param name - Step name
   * @param fn -Receives the generated callbackId and returns a delivered promise
   * @returns The value returned by the executed function
   */
  waitForCallback<T>(name: string, fn: (callbackId: string) => Promise<void>): Promise<T>
  // @todo: other methods wanted for durables
}

/**
 * @alpha Using pipeline functions is considered experimental and may change in the future.
 * @hidden
 */
export type PipelineHandler = (envelope: {
  context: FunctionContext
  event?: GenericEvent
  step: PipelineOperations
}) => unknown | Promise<unknown>
