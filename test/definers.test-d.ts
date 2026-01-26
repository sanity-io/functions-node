import {assertType, describe, expect, expectTypeOf, test} from 'vitest'
import {
  type DocumentEvent,
  type DocumentEventHandler,
  documentEventHandler,
  type FunctionContext,
  type ScheduleEventHandler,
  type ScheduleFunctionContext,
  scheduleEventHandler,
} from '../src'

describe('documentEventHandler', () => {
  const context: FunctionContext = {
    eventResourceId: 'abc123.xyz789',
    eventResourceType: 'dataset',
    functionResourceId: 'abc123',
    functionResourceType: 'project',
    clientOptions: {projectId: 'abc123', dataset: 'xyz789', token: 'sk_some-token'},
  }

  const event: DocumentEvent = {
    data: {_id: 'docId', _type: 'docType'},
  }

  test('has correct type signature', () => {
    expectTypeOf(documentEventHandler).toBeFunction()
    expectTypeOf(documentEventHandler).parameter(0).toExtend<DocumentEventHandler>()
    expectTypeOf(documentEventHandler).returns.toExtend<DocumentEventHandler>()

    // @ts-expect-error should be a function
    assertType(documentEventHandler('foo'))
  })

  test('handler envelope has correct types', () => {
    const handler = documentEventHandler((envelope) => {
      expectTypeOf(envelope.context).toEqualTypeOf<FunctionContext>()
      expectTypeOf(envelope.event).toEqualTypeOf<DocumentEvent>()
      expect(envelope.context).toEqual(context)
      expect(envelope.event).toEqual(event)
      expectTypeOf(envelope.event.data).toBeAny()
    })

    handler({context, event})
  })

  test('can pass data type as generic', () => {
    const handler = documentEventHandler<{foo: string}>((envelope) => {
      expectTypeOf(envelope.event.data).toEqualTypeOf<{foo: string}>()
      expect(envelope.event.data.foo).toBe('bar')
    })

    handler({context, event: {data: {foo: 'bar'}}})

    const unknownHandler = documentEventHandler<unknown>((envelope) => {
      expectTypeOf(envelope.event.data).toEqualTypeOf<unknown>()

      // @ts-expect-error accessing `foo` on unknown should fail
      expect(envelope.event.data.foo).toBe('bar')
    })

    unknownHandler({context, event})
  })
})

describe('scheduleEventHandler', () => {
  const context: ScheduleFunctionContext = {
    local: true,
  }

  test('has correct type signature', () => {
    expectTypeOf(scheduleEventHandler).toBeFunction()
    expectTypeOf(scheduleEventHandler).parameter(0).toExtend<ScheduleEventHandler>()
    expectTypeOf(scheduleEventHandler).returns.toExtend<ScheduleEventHandler>()

    // @ts-expect-error should be a function
    assertType(scheduleEventHandler('foo'))
  })

  test('handler envelope has correct types', () => {
    const handler = scheduleEventHandler((envelope) => {
      expectTypeOf(envelope.context).toEqualTypeOf<ScheduleFunctionContext>()
      expect(envelope.context).toEqual(context)
    })

    handler({context})
  })

  test('runs a handler', async () => {
    const handler: ScheduleEventHandler = () => {
      return Promise.resolve()
    }

    await expect(handler({context})).resolves.toBeUndefined()
  })
})
