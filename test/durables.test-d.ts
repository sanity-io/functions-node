import {assertType, describe, expectTypeOf, test} from 'vitest'
import type {
  DurableAttemptArgs,
  DurableCallbackArgs,
  DurableContext,
  DurableDuration,
  DurableLogger,
  DurableOperations,
  DurableWaitForConditionDecision,
  DurableWaitForConditionOptions,
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
    const result = step.run('load-article', (args) => {
      expectTypeOf(args).toEqualTypeOf<DurableAttemptArgs>()
      expectTypeOf(args.attempt).toEqualTypeOf<number>()
      args.logger.info('Loading article')

      return {id: 'article-id' as string}
    })

    expectTypeOf(result).toEqualTypeOf<Promise<{id: string}>>()
  })

  test('continues accepting callbacks that ignore context', () => {
    const result = step.run('return-value', () => 42)

    expectTypeOf(result).toEqualTypeOf<Promise<number>>()
  })
})

describe('DurableOperations.wait', () => {
  test('accepts a named AWS duration and resolves void', () => {
    const result = step.wait('rate-limit', {minutes: 1})

    expectTypeOf(result).toEqualTypeOf<Promise<void>>()
  })

  test('rejects unsupported calls', () => {
    // @ts-expect-error numeric durations are unsupported
    step.wait('delay', 30)

    // @ts-expect-error empty duration is unsupported
    step.wait('delay', {})
  })
})

describe('DurableOperations.waitForCallback', () => {
  test('provides callback ID and DurableCallbackArgs', () => {
    const result = step.waitForCallback<{approved: boolean}>('approval', async (callbackId, args) => {
      expectTypeOf(callbackId).toEqualTypeOf<string>()
      expectTypeOf(args).toEqualTypeOf<DurableCallbackArgs>()
      args.logger.info('Submitting approval request', callbackId)
    })

    expectTypeOf(result).toEqualTypeOf<Promise<{approved: boolean}>>()
  })
})

describe('DurableOperations.waitForCondition', () => {
  test('carries the same state through the full contract', () => {
    const result = step.waitForCondition<ArticleState>(
      'wait-for-article',
      async (state, args) => {
        expectTypeOf(state).toEqualTypeOf<ArticleState>()
        expectTypeOf(args.logger).toEqualTypeOf<DurableLogger>()
        expectTypeOf(args.attempt).toEqualTypeOf<number>()

        return {
          ...state,
          article: {_id: 'article-id', title: 'Article'},
        }
      },
      {
        initial: {
          article: null,
        },
        next: (state, attempt) => {
          expectTypeOf(state).toEqualTypeOf<ArticleState>()
          expectTypeOf(attempt).toEqualTypeOf<number>()

          if (state.article) {
            return {shouldContinue: false}
          }

          return {
            shouldContinue: true,
            delay: {seconds: attempt},
          }
        },
      },
    )
    expectTypeOf(result).toEqualTypeOf<Promise<ArticleState>>()
  })

  test('accepts both decision branches', () => {
    assertType<DurableWaitForConditionDecision>({
      shouldContinue: false,
    })

    assertType<DurableWaitForConditionDecision>({
      shouldContinue: true,
      delay: {seconds: 5},
    })
  })

  test('rejects an incomplete continue decision', () => {
    const invalidNext = () => ({
      shouldContinue: true as const,
    })

    const options: DurableWaitForConditionOptions<ArticleState> = {
      initial: {article: null},
      // @ts-expect-error continuing requires a delay
      next: invalidNext,
    }

    expectTypeOf(options).toExtend<DurableWaitForConditionOptions<ArticleState>>()
  })
})
