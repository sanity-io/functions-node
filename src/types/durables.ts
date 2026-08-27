import type {FunctionContext} from './context'
import type {GenericEvent} from './functions'
import type {BlueprintResource} from './resources'

/**
 * Durable alias of FunctionsContext
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableContext = FunctionContext

/**
 * Logger interface for durables.
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export interface DurableLogger {
  debug(...params: unknown[]): void
  info(...params: unknown[]): void
  warn(...params: unknown[]): void
  error(...params: unknown[]): void
  log(...params: unknown[]): void
}

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export interface DurableStepCallbackContext {
  logger: DurableLogger
}

/**
 * Arguments passed to callbacks that execute a durable attempt.
 * step.run & step.waitForCondition
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export interface DurableStepAttemptContext extends DurableStepCallbackContext {
  /** Current attempt number, starting at 1. */
  attempt: number
}

/**
 * The signature of the duration object passed to the `wait` method of a durable function.
 * It can be specified in days, hours, minutes, or seconds.
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableDuration =
  | {days: number; hours?: number; minutes?: number; seconds?: number}
  | {hours: number; minutes?: number; seconds?: number}
  | {minutes: number; seconds?: number}
  | {seconds: number}

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableWaitForConditionDecision = {shouldRetry: true; delay: DurableDuration} | {shouldRetry: false}

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableStepHandler<TArgs extends unknown[], TReturn> = (...args: TArgs) => TReturn

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableStepRunHandler<T = unknown> = DurableStepHandler<[context: DurableStepAttemptContext], T | Promise<T>>

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableStepWaitForCallbackHandler = DurableStepHandler<[callbackId: string, context: DurableStepCallbackContext], Promise<void>>

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableWaitForConditionPoller<T = unknown> = DurableStepHandler<[state: T, context: DurableStepAttemptContext], Promise<T>>

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableWaitForConditionNext<T = unknown> = DurableStepHandler<
  [state: T, context: Pick<DurableStepAttemptContext, 'attempt'>],
  DurableWaitForConditionDecision
>

/**
 * The interface defining the operations available to a durable function.
 * These operations are steps that delegate to other functions, and wait for external callbacks.
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableOperations = {
  /**
   * Runs a named step. Its result is recorded, so if the workflow re-runs the step
   * is not executed again. Failures are retried on their own.
   * similar to ctx.step()
   * @remarks cannot be nested inside another step
   * @example
   * ```ts
   * step.run({
   *   name: 'run-step',
   *   handler: async ({logger}) => {
   *    logger.log('Running step')
   *  }})
   * ```
   * @param name - Step name
   * @param handler - function being executed
   * @returns The value returned by the executed function
   */
  run<T>({name, handler}: {name?: string; handler: DurableStepRunHandler<T>}): Promise<T>

  /**
   * Calls another function and awaits its result.
   * similar to ctx.invoke()
   * @remarks cannot be nested inside another step
   * @param name - Step name
   * @param handler - Function to be invoked
   * @param input - Data passed to the called function
   * @returns The value returned by the called function
   */
  delegate<T>({
    name,
    handler,
    input,
  }: {
    name?: string
    handler: string | BlueprintResource<`sanity.function.${string}`>
    input?: unknown
  }): Promise<T>

  /**
   * Waits for an external callback
   * similar to ctx.waitForCallback()
   * @remarks cannot be nested inside another step
   * @param name - Step name
   * @param handler - Receives the generated callbackId and returns a delivered promise
   * @returns The value returned by the executed function
   */
  waitForCallback<T>({name, handler}: {name?: string; handler: DurableStepWaitForCallbackHandler}): Promise<T>

  /**
   * Waits for a specified duration
   * similar to ctx.wait()
   * @remarks cannot be nested inside another step
   * @example
   * Wait for 30 seconds
   * ```ts
   * await step.wait({name: 'wait30Sec', duration: { seconds: 30 }});
   * ```
   * Wait for 2 days and 3 hours
   * ```ts
   * await step.wait({name: 'waitALongTime', duration: { days: 2, hours: 3 }});
   * ```
   * @param name - Step name
   * @param duration - Amount of time the function will wait before continuing.
   * Duration is an object with properties of `seconds`, `minutes`, `hours`, or `days`. Must be at least {seconds: 1}
   * @returns Resolves after the duration
   */
  wait({name, duration}: {name?: string; duration: DurableDuration}): Promise<void>

  /**
   * Waits for a specified condition to be met
   * similar to ctx.waitForCondition()
   * @remarks cannot be nested inside another step
   * @example
   * ```ts
   * await step.waitForCondition({{
   *     name: 'waitForCondition',
   *     initial: {
   *       article: null,
   *     },
   *     poller: async (state, {attempt}) => {
   *         const client = createClient({
   *            apiVersion: '2026-08-05',
   *            ...context.clientOptions,
   *          })
   *          const article = await client.fetch<Article | null>(
   *            '*[_type == "article"][0]',
   *          )
   *         return {...state, article}
   *     }
   *     next: (state, {attempt}) => {
   *       if (state.article) return {shouldResume: false}
   *
   *       return {
   *         shouldResume: true,
   *         delay: {
   *           seconds: Math.min(attempt * 2, 60),
   *         },
   *       }
   *     },
   *   },
   * )
   * ```
   * @param name - Step name
   * @param initial - Initial state passed to the first poller call.
   * @param poller - Called on each attempt with the current state and condition context.
   * @param next - A function that determines whether the condition has been met or another check should be run.
   * Returns a promise resolving to the updated state,
   * which is passed to next to determine whether the condition has been met or another check should be run.
   * @returns The value returned by the executed function
   */
  waitForCondition<T>({
    name,
    initial,
    next,
    poller,
  }: {
    name?: string
    initial: T
    poller: DurableWaitForConditionPoller<T>
    next: DurableWaitForConditionNext<T>
  }): Promise<T>
}

/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type DurableHandler = (envelope: {
  context: DurableContext
  event?: GenericEvent
  step: DurableOperations
  logger: DurableLogger
}) => unknown | Promise<unknown>
