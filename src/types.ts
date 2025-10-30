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
 * A function handler for a document event.
 *
 * @beta
 */
export type DocumentEventHandler<IData = any> = (envelope: {
  context: FunctionContext
  event: DocumentEvent<IData>
}) => void | Promise<void>
