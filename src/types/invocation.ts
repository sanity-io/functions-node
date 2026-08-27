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
