import {assertType, describe, expectTypeOf, test} from 'vitest'
import type {
  DurableContext,
  DurableDuration,
  DurableLogger,
  DurableOperations,
  DurableStepAttemptContext,
  DurableStepCallbackContext,
  DurableWaitForConditionDecision,
  FunctionContext,
} from '../src'

const context = {} as DurableContext
const step = {} as DurableOperations

type Article = {
  _id: string
  title: string
}

type ArticleState = {
  article: Article | null
}

describe('DurableContext', () => {
  test('contains the complete FunctionContext', () => {
    expectTypeOf<DurableContext>().toExtend<FunctionContext>()
    expectTypeOf(context.clientOptions).toEqualTypeOf<FunctionContext['clientOptions']>()
    expectTypeOf(context.resources).toEqualTypeOf<FunctionContext['resources']>()
  })

  test('does not expose operation metadata', () => {
    // @ts-expect-error attempt is not available at handler scope
    context.attempt
  })

  test('exposes the AWS-compatible logger methods', () => {
    const logger = {} as DurableLogger
    expectTypeOf(logger.debug('debug')).toEqualTypeOf<void>()
    expectTypeOf(logger.info('info')).toEqualTypeOf<void>()
    expectTypeOf(logger.warn('warn')).toEqualTypeOf<void>()
    expectTypeOf(logger.error('error')).toEqualTypeOf<void>()
    expectTypeOf(logger.log('INFO', 'generic log')).toEqualTypeOf<void>()

    logger.log('INFO', 'generic log')

    // @ts-expect-error durable logger does not expose trace
    logger.trace('trace')

    // @ts-expect-error durable logger does not expose fatal
    logger.fatal('fatal')

    // @ts-expect-error durable logger does not expose dir
    logger.dir('something')
  })
})

describe('DurableDuration', () => {
  test('accepts each AWS duration shape', () => {
    assertType<DurableDuration>({seconds: 30})
    assertType<DurableDuration>({minutes: 5})
    assertType<DurableDuration>({hours: 2})
    assertType<DurableDuration>({days: 1})

    assertType<DurableDuration>({
      days: 1,
      hours: 2,
      minutes: 30,
      seconds: 15,
    })
  })

  test('rejects invalid duration shapes', () => {
    // @ts-expect-error at least one supported duration unit is required
    assertType<DurableDuration>({})

    // @ts-expect-error milliseconds are not supported
    assertType<DurableDuration>({milliseconds: 500})

    // @ts-expect-error durations must be objects
    assertType<DurableDuration>(30)
  })
})

describe('DurableOperations.run', () => {
  test('provides DurableContext and infers the result', () => {
    const result = step.run({
      name: 'load-article',
      handler: (ctx) => {
        expectTypeOf(ctx).toEqualTypeOf<DurableStepAttemptContext>()
        expectTypeOf(ctx.attempt).toEqualTypeOf<number>()
        ctx.logger.info('Loading article')

        return {id: 'article-id' as string}
      },
    })

    expectTypeOf(result).toEqualTypeOf<Promise<{id: string}>>()
  })

  test('continues accepting callbacks that ignore context', () => {
    const result = step.run({
      name: 'return-value',
      handler: () => 42,
    })

    expectTypeOf(result).toEqualTypeOf<Promise<number>>()
  })
})

describe('DurableOperations.wait', () => {
  test('accepts a named AWS duration and resolves void', () => {
    const result = step.wait({name: 'rate-limit', duration: {minutes: 1}})

    expectTypeOf(result).toEqualTypeOf<Promise<void>>()
  })

  test('rejects unsupported calls', () => {
    // @ts-expect-error numeric durations are unsupported
    step.wait({name: 'delay', duration: 30})

    // @ts-expect-error empty duration is unsupported
    step.wait({name: 'delay', duration: {}})
  })
})

describe('DurableOperations.waitForCallback', () => {
  test('provides callback ID and DurableStepCallbackContext', () => {
    const result = step.waitForCallback<{approved: boolean}>({
      name: 'approval',
      handler: async (callbackId, ctx) => {
        expectTypeOf(callbackId).toEqualTypeOf<string>()
        expectTypeOf(ctx).toEqualTypeOf<DurableStepCallbackContext>()
        ctx.logger.info('Submitting approval request', callbackId)
      },
    })

    expectTypeOf(result).toEqualTypeOf<Promise<{approved: boolean}>>()
  })
})

describe('DurableOperations.waitForCondition', () => {
  test('carries the same state through the full contract', () => {
    const result = step.waitForCondition<ArticleState>({
      name: 'wait-for-article',
      initial: {article: null},
      poller: async (state, ctx) => {
        expectTypeOf(state).toEqualTypeOf<ArticleState>()
        expectTypeOf(ctx.logger).toEqualTypeOf<DurableLogger>()
        expectTypeOf(ctx.attempt).toEqualTypeOf<number>()

        return {
          ...state,
          article: {_id: 'article-id', title: 'Article'},
        }
      },
      next: (state, {attempt}) => {
        expectTypeOf(state).toEqualTypeOf<ArticleState>()
        expectTypeOf(attempt).toEqualTypeOf<number>()

        if (state.article) {
          return {shouldRetry: false}
        }

        return {
          shouldRetry: true,
          delay: {seconds: attempt},
        }
      },
    })
    expectTypeOf(result).toEqualTypeOf<Promise<ArticleState>>()
  })

  test('accepts both decision branches', () => {
    assertType<DurableWaitForConditionDecision>({
      shouldRetry: false,
    })

    assertType<DurableWaitForConditionDecision>({
      shouldRetry: true,
      delay: {seconds: 5},
    })
  })

  test('next must not return a promise', () => {
    step.waitForCondition<ArticleState>({
      name: 'wait-for-article',
      initial: {article: null},
      poller: async (state, _ctx) => {
        return {
          ...state,
          article: {_id: 'article-id', title: 'Article'},
        }
      },
      // @ts-expect-error - testing fail
      next: (_state, {_attempt}) => {
        assertType<DurableWaitForConditionDecision>(
          // @ts-expect-error next must return a decision synchronously, not a promise
          Promise.resolve({shouldRetry: false}),
        )
      },
    })
  })
})
