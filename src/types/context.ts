import type {InvokeCallback} from './invocation.js'
import type {ResourcesApi} from './resources.js'

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
    token: string
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
 * A generic function context type which supports all function types
 */
export type GenericContext = FunctionContext | ScheduledFunctionContext | SyncTagInvalidateContext
