import type {FunctionContext} from './context.js'
import type {GenericEvent} from './functions.js'
import type {BlueprintResource} from './resources.js'

/**
 * Durable alias of FunctionsContext
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableContext = FunctionContext

/**
 * Logger interface for durables.
 * @beta Using durables is considered experimental and may change in the future.
 */
export interface DurableLogger {
  debug(...params: unknown[]): void
  info(...params: unknown[]): void
  warn(...params: unknown[]): void
  error(...params: unknown[]): void
  log(...params: unknown[]): void
}

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export interface DurableStepCallbackContext {
  logger: DurableLogger
}

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export interface DurableStepContext extends DurableStepCallbackContext {
  step: DurableOperations
}
/**
 * Context parameter passed to a branch method of a `step.fanout` execution.
 * @beta Using durables is considered experimental and may change in the future.
 */
export interface DurableFanoutBranchContext extends DurableStepContext {}

/**
 * Context parameter passed to the top-level `durableEventHandler` method.
 * @beta Using durables is considered experimental and may change in the future.
 */
export interface DurableTopLevelContext extends DurableStepContext {
  context: DurableContext
  event?: GenericEvent
}

/**
 * Context parameter passed to the `waitForCallback` submitter method.
 * @beta Using durables is considered experimental and may change in the future.
 */
export interface DurableCallbackSubmitterContext extends DurableStepCallbackContext {
  callbackId: string
}

/**
 * Arguments passed to `step.run` & `step.waitForCondition` callbacks that execute a durable attempt.
 * @beta Using durables is considered experimental and may change in the future.
 */
export interface DurableStepAttemptContext extends DurableStepCallbackContext {
  /** Current attempt number, starting at 1. */
  attempt: number
}

/**
 * The signature of the duration object passed to `wait`, `waitForCondition` and `waitForCallback` methods. It is also used when specifying the `retry.delay` of durable steps.
 * It can be specified in days, hours, minutes, or seconds.
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableDuration =
  | {days: number; hours?: number; minutes?: number; seconds?: number}
  | {hours: number; minutes?: number; seconds?: number}
  | {minutes: number; seconds?: number}
  | {seconds: number}

/**
 * @beta: Using durables is considered experimental and may change in the future.
 */
export interface DurableRetryStrategy {
  maxAttempts?: number
  // @todo: tie this to a string like "5s" or "1m" and normalize it to a duration object
  delay?: DurableDuration
}

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableWaitForConditionDecision = {shouldRetry: true; delay: DurableDuration} | {shouldRetry: false}

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableStepHandler<TArgs extends unknown[], TReturn> = (...args: TArgs) => TReturn

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableStepRunHandler<T = unknown> = DurableStepHandler<[context: DurableStepAttemptContext], T | Promise<T>>

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableStepFanoutHandler<T = unknown> = DurableStepHandler<[context: DurableFanoutBranchContext], T | Promise<T>>

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableStepFanoutNamedHandler<T = unknown> = {
  func: DurableStepHandler<[context: DurableFanoutBranchContext], T | Promise<T>>
  name?: string
}

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableStepWaitForCallbackSubmitter = DurableStepHandler<[context: DurableCallbackSubmitterContext], Promise<void>>

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableWaitForConditionPoller<T = unknown> = DurableStepHandler<[state: T, context: DurableStepAttemptContext], Promise<T>>

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableWaitForConditionNext<T = unknown> = DurableStepHandler<
  [state: T, context: Pick<DurableStepAttemptContext, 'attempt'>],
  DurableWaitForConditionDecision
>

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type BatchItemSucceededStatus = 'SUCCEEDED'

/**
 * @beta Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type BatchItemFailedStatus = 'FAILED'

/**
 * @beta Using durables is considered experimental and may change in the future.
 * @hidden
 */
export type BatchItemStartedStatus = 'STARTED'

/**
 * @beta Using durables is considered experimental and may change in the future.
 */
export type BatchItemStatus = BatchItemSucceededStatus | BatchItemFailedStatus | BatchItemStartedStatus

/**
 * Reason why a `step.fanout` operation completed.
 * - `ALL_COMPLETED`: every item finished.
 * - `MIN_SUCCESSFUL_REACHED`: CompletionConfig.minSuccessful was reached.
 * - `FAILURE_TOLERANCE_EXCEEDED`: a failure threshold was exceeded.
 * - `CUSTOM_COMPLETION_SUCCEEDED`: a custom CompletionConfig.shouldComplete
 *   predicate signalled completion with a `SUCCEEDED` outcome before all items
 *   finished.
 * - `CUSTOM_COMPLETION_FAILED`: a custom CompletionConfig.shouldComplete
 *   predicate signalled completion with a `FAILED` outcome before all items
 *   finished.
 * @beta Using durables is considered experimental and may change in the future.
 */
export type CompletionReason =
  | 'ALL_COMPLETED'
  | 'MIN_SUCCESSFUL_REACHED'
  | 'FAILURE_TOLERANCE_EXCEEDED'
  | 'CUSTOM_COMPLETION_SUCCEEDED'
  | 'CUSTOM_COMPLETION_FAILED'

/**
 * The result of a `step.fanout` branch.
 * @beta Using durables is considered experimental and may change in the future.
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
 * @beta Using durables is considered experimental and may change in the future.
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
 * The interface defining the durable operations available to a durable function.
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableOperations = {
  /**
   * Runs a named step. Its result is recorded, so if the durable re-runs the step
   * is not executed again. Failures are retried on their own.
   * @example
   * ```ts
   * const hi = await step.run({
   *   name: 'run-step',
   *   handler: async ({logger}) => {
   *    logger.log('Running step')
   *    return 'hi'
   *  }})
   * ```
   *
   * @example
   * ```ts
   * // With a retry config
   * const hello = await step.run({
   *   name: 'run-with-retry'
   *   handler: () => {
   *     if (Math.random() > 0.5) throw new Error('random error!')
   *     return 'hello'
   *   }
   *   retry: { maxAttempts: 2, delay: { seconds: 5 } }
   * })
   * ```
   * @param name - Step name
   * @param handler - function being executed
   * @param retry - retry configuration
   * @returns The value returned by the provided handler
   */
  run<T>({name, handler, retry}: {name?: string; handler: DurableStepRunHandler<T>; retry?: DurableRetryStrategy}): Promise<T>

  /**
   * Runs a set of steps, or branches, in parallel. Each branch contains its own child durable context, with all usual `step` operations available. Branches may be named.
   * @remarks By using the generic, you can set a single, homogeneous return type for all branches.
   * @example
   * ```ts
   * const results: BatchResult<string> = await step.fanout<string>({
   *   name: 'parallel-runs',
   *   branches: [async ({step, logger}) => {
   *    logger.log('Running first function in parallel')
   *    return 'first'
   *   }, {
   *     func: async ({step, logger}) => {
   *      logger.log('Running second function in parallel')
   *      return 'second'
   *     },
   *     name: 'second-branch',
   *   }],
   * })
   * ```
   * @param name - Step name
   * @param branches - functions being executed in parallel
   * @returns A batch result of values returned or errors thrown by all branches.
   */
  fanout<T>({
    name,
    branches,
  }: {
    name?: string
    branches: (DurableStepFanoutHandler<T> | DurableStepFanoutNamedHandler<T>)[]
  }): Promise<BatchResult<T>>
  /**
   * Runs a set of steps, or branches, in parallel. Each branch contains its own child durable context, with all usual `step` operations available.
   * @remarks This overload provides automatic type inference for heterogeneous branch return types. When branches return different types, the result will be `BatchResult<T1 | T2 | ...>`.
   * Use the explicit type parameter overloads above for strict homogeneous type checking.
   * @example
   * ```ts
   * const results: BatchResult<string | number> = await step.fanout({
   *   name: 'parallel-runs',
   *   branches: [async ({step, logger}) => {
   *    logger.log('Running first function in parallel')
   *    return 'first'
   *   }, async ({step, logger}) => {
   *    logger.log('Running second function in parallel')
   *    return 2
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
  }): Promise<
    BatchResult<
      Branches[number] extends DurableStepFanoutHandler<infer ReturnType>
        ? ReturnType
        : Branches[number] extends DurableStepFanoutNamedHandler<infer ReturnType>
          ? ReturnType
          : never
    >
  >

  /**
   * Invokes another function, of type durable or pubsub, and awaits its result. While awaiting, the durable function shuts down, so you are not charged for compute.
   * @example
   * ```ts
   * // my-delegated-function/index.ts
   * export const handler = pubSubEventHandler(({event}) => {
   *   return 'yo'
   * })
   *
   * // my-resource/index.ts
   * export const handler = pubSubEventHandler(({event}) => {
   *   return 'hey'
   * })
   *
   * // my-durable-function/index.ts
   * export const handler = durableEventHandler(({step, context}) => {
   *   // With a function name
   *   const firstResult = await step.delegate({name: 'first-delegation', handler: 'my-delegated-function', event: {data: {hello: 'world'}}})
   *   // With a resource object
   *   const secondResult = await step.delegate({name: 'second-delegation', handler: context.resource.function('my-resource'), event: {data: {hello: 'world'}}})
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
   * Generates a unique callback ID, runs a submitter function to pass the ID to an external system and waits for some external system to POST JSON data to a Sanity Durable callback API using the callback ID.
   * @example
   * ```ts
   * try {
   *   const successfulResult = await step.waitForCallback({name: 'ask-for-permission', submitter: async ({callbackId}) => {
   *     await sendForApproval(callbackId)
   *   }})
   * } catch (e) {
   *   logger.log('oh no we received a callback failure', e)
   * }
   * ```
   * ```
   * @param name - Step name
   * @param submitter - Function that submits the provided callbackId parameter to an external system
   * @param timeout - Maximum time to wait for the callback result
   * @param retry - retry configuration for the submitter function
   * @returns The value returned to the Sanity Durable callback HTTP API
   */
  waitForCallback<T>({
    name,
    submitter,
    timeout,
    retry,
  }: {
    name?: string
    submitter: DurableStepWaitForCallbackSubmitter
    timeout?: DurableDuration
    retry?: DurableRetryStrategy
  }): Promise<T>

  /**
   * Waits for a specified duration
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
   * @returns Resolves after the duration
   */
  wait({name, duration}: {name?: string; duration: DurableDuration}): Promise<void>

  /**
   * Waits for a specified condition to be met by executing a `poller` method to retrieve state and then inspecting the retrieved state in a `next` method to determine whether to retry and after what delay to do so.
   * @example
   * ```ts
   * await step.waitForCondition({{
   *   name: 'waitForCondition',
   *   initial: {
   *     article: null as Article | null,
   *   },
   *   poller: async (state, {attempt}) => {
   *     const client = createClient({
   *       apiVersion: '2026-08-05',
   *       ...context.clientOptions,
   *     })
   *     const article = await client.fetch<Article | null>(
   *       '*[_type == "article"][0]',
   *     )
   *     return {...state, article}
   *   },
   *   next: (state, {attempt}) => {
   *     if (state.article) return {shouldRetry: false}
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
 * @beta Using durables is considered experimental and may change in the future.
 */
export type DurableHandler = (envelope: DurableTopLevelContext) => unknown | Promise<unknown>
