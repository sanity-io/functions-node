import type {FunctionContext} from './context.js'
import type {GenericEvent} from './functions.js'
import type {BlueprintResource} from './resources.js'

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
 * Context parameter passed to a branch method of a `step.fanout` execution.
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export interface DurableStepContext extends DurableStepCallbackContext {
  step: DurableOperations
}
export interface DurableFanoutBranchContext extends DurableStepContext {}

/**
 * Context parameter passed to the top-level `durableEventHandler` method.
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export interface DurableTopLevelContext extends DurableStepContext {
  context: DurableContext
  event?: GenericEvent
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
 * @alpha: Using durables is considered experimental and may change in the future.
 * @hidden
 */
export interface DurableRetryStrategy {
  maxAttempts?: number
  // @todo: tie this to a string like "5s" or "1m" and normalize it to a duration object
  delay?: DurableDuration
}

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
export type DurableStepFanoutHandler<T = unknown> = DurableStepHandler<[context: DurableFanoutBranchContext], T | Promise<T>>

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
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type BatchItemSucceededStatus = 'SUCCEEDED'
/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type BatchItemFailedStatus = 'FAILED'
/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type BatchItemStartedStatus = 'STARTED'
/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type BatchItemStatus = BatchItemSucceededStatus | BatchItemFailedStatus | BatchItemStartedStatus
/**
 * Reason why a batch operation (map, parallel, or concurrent execution)
 * completed.
 *
 * - `ALL_COMPLETED`: every item finished.
 * - `MIN_SUCCESSFUL_REACHED`: CompletionConfig.minSuccessful was reached.
 * - `FAILURE_TOLERANCE_EXCEEDED`: a failure threshold was exceeded.
 * - `CUSTOM_COMPLETION_SUCCEEDED`: a custom CompletionConfig.shouldComplete
 *   predicate signalled completion with a `SUCCEEDED` outcome before all items
 *   finished.
 * - `CUSTOM_COMPLETION_FAILED`: a custom CompletionConfig.shouldComplete
 *   predicate signalled completion with a `FAILED` outcome before all items
 *   finished.
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 * @remarks copied from AWS Durable Execution SDK
 */
export type CompletionReason =
  | 'ALL_COMPLETED'
  | 'MIN_SUCCESSFUL_REACHED'
  | 'FAILURE_TOLERANCE_EXCEEDED'
  | 'CUSTOM_COMPLETION_SUCCEEDED'
  | 'CUSTOM_COMPLETION_FAILED'
/**
 * The result of a `step.fanout` branch.
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 * @remarks copied from AWS Durable Execution SDK
 */
export interface BatchItem<TResult> {
  /** The result value if the item succeeded */
  result?: TResult
  /** The error if the item failed */
  error?: Error
  /** Index of the item in the original array */
  index: number
  /** Status of the item execution */
  status: BatchItemStatus
}
/**
 * @alpha Using durables is considered experimental and may change in the future.
 * @hidden
 * @remarks copied from AWS Durable Execution SDK
 */
export interface BatchResult<TResult> {
  /**
   * All items in the batch with their results/errors.
   */
  all: Array<BatchItem<TResult>>
  /** Returns only the items that succeeded */
  succeeded(): Array<
    BatchItem<TResult> & {
      result: TResult
    }
  >
  /** Returns only the items that failed */
  failed(): Array<
    BatchItem<TResult> & {
      error: Error
    }
  >
  /**
   * Returns only the items that are still in progress (STARTED) — items that
   * were in flight when the batch completed early (e.g. via CompletionConfig.minSuccessful
   * or a custom CompletionConfig.shouldComplete).
   */
  started(): Array<
    BatchItem<TResult> & {
      status: BatchItemStartedStatus
    }
  >
  /** Overall status of the batch (SUCCEEDED if no failures, FAILED otherwise) */
  status: BatchItemSucceededStatus | BatchItemFailedStatus
  /** Reason why the batch completed */
  completionReason: CompletionReason
  /** Whether any item in the batch failed */
  hasFailure: boolean
  /** Throws the first error if any item failed */
  throwIfError(): void
  /** Returns array of all successful results */
  getResults(): Array<TResult>
  /** Returns array of all errors */
  getErrors(): Array<Error>
  /** Number of successful items */
  successCount: number
  /** Number of failed items */
  failureCount: number
  /**
   * Number of started but not completed items. Not guaranteed to be stable across suspend/resume
   */
  startedCount: number
  /** Total number of items */
  totalCount: number
}

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
   *
   * @example
   * ```ts
   * // With a retry config
   * step.run({
   *   name: 'run-with-retry'
   *   handler: () => { // handler code }
   *   retry: { maxAttempts: 2, delay: { seconds: 5 } }
   * })
   * ```
   * @param name - Step name
   * @param handler - function being executed
   * @param retry - retry configuration
   * @returns The value returned by the executed function
   */
  run<T>({name, handler, retry}: {name?: string; handler: DurableStepRunHandler<T>; retry?: DurableRetryStrategy}): Promise<T>

  /**
   * Runs a set of steps, or branches, in parallel. Each branch contains its own child durable context, with all usual `step` operations available.
   * @remarks By using the generic, you can set a single, homogeneous return type for all branches.
   * @example
   * ```ts
   * step.fanout<string>({
   *   name: 'parallel-runs',
   *   branches: [async ({step, logger}) => {
   *    logger.log('Running first function in parallel')
   *    return 'first'
   *   }, async ({step, logger}) => {
   *    logger.log('Running second function in parallel')
   *    return 'second'
   *   }],
   * })
   * ```
   * @param name - Step name
   * @param branches - functions being executed in parallel
   * @returns A batch result of values returned or errors thrown by all branches.
   */
  fanout<T>({name, branches}: {name?: string; branches: DurableStepFanoutHandler<T>[]}): Promise<BatchResult<T>>
  /**
   * Runs a set of steps, or branches, in parallel. Each branch contains its own child durable context, with all usual `step` operations available.
   * @remarks This overload provides automatic type inference for heterogeneous branch return types. When branches return different types, the result will be `BatchResult<T1 | T2 | ...>`.
   * Use the explicit type parameter overloads above for strict homogeneous type checking.
   * @example
   * ```ts
   * step.fanout<string>({
   *   name: 'parallel-runs',
   *   branches: [async ({step, logger}) => {
   *    logger.log('Running first function in parallel')
   *    return 'first'
   *   }, async ({step, logger}) => {
   *    logger.log('Running second function in parallel')
   *    return 'second'
   *   }],
   * })
   * ```
   * @param name - Step name
   * @param branches - functions being executed in parallel
   * @returns A batch result of values returned or errors thrown by all branches.
   */
  fanout<Branches extends readonly unknown[]>({
    name,
    branches,
  }: {
    name?: string
    branches: Branches
  }): Promise<BatchResult<Branches[number] extends DurableStepFanoutHandler<infer ReturnType> ? ReturnType : never>>

  /**
   * Calls another function and awaits its result.
   * similar to ctx.invoke()
   * @remarks cannot be nested inside another step
   * @example
   * ```ts
   * // my-delegated-function/index.ts
   * export const handler = pubSubEventHandler({event}) => {
   *    ...
   * }
   *
   * // my-resource/index.ts
   * export const handler = pubSubEventHandler({event}) => {
   *    ...
   * }
   *
   * // my-durable-function/index.ts
   * durableEventHandler(({step, context}) => {
   *   // With a function name
   *   step.delegate({name: 'my-function', handler: 'my-delegated-function', event: {data: {hello: 'world'}}})
   *   // With a resource object
   *   step.delegate({name: 'another-function', handler: context.resource.function('my-resource'), event: {data: {hello: 'world'}}})
   * })
   * ```
   * @param name - Step name
   * @param handler - Function to be invoked
   * @param event - Data passed to the called function
   * @returns The value returned by the called function
   */
  delegate<T>({
    name,
    handler,
    event,
  }: {
    name?: string
    handler: string | BlueprintResource<`sanity.function.${string}`>
    event?: unknown
    retry?: DurableRetryStrategy
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
   *       if (state.article) return {shouldRetry: false}
   *
   *       return {
   *         shouldRetry: true,
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
export type DurableHandler = (envelope: DurableTopLevelContext) => unknown | Promise<unknown>
