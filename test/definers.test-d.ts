import {assertType, describe, expect, expectTypeOf, test} from 'vitest'
import {
  type DocumentEvent,
  type DocumentEventHandler,
  type FunctionContext,
  defineDocumentEventHandler,
  documentEventHandler,
} from '../src'

describe('documentEventHandler', () => {
  const context: FunctionContext = {
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

describe('defineDocumentEventHandler', () => {
  const context: FunctionContext = {
    clientOptions: {projectId: 'abc123', dataset: 'xyz789', token: 'sk_some-token'},
  }

  const event: DocumentEvent = {
    data: {_id: 'docId', _type: 'docType'},
  }

  test('has correct type signature', () => {
    expectTypeOf(defineDocumentEventHandler).toBeFunction()
    expectTypeOf(defineDocumentEventHandler).parameter(0).toExtend<DocumentEventHandler>()
    expectTypeOf(defineDocumentEventHandler).returns.toExtend<DocumentEventHandler>()

    // @ts-expect-error should be a function
    assertType(defineDocumentEventHandler('foo'))
  })

  test('handler envelope has correct types', () => {
    const handler = defineDocumentEventHandler((envelope) => {
      expectTypeOf(envelope.context).toEqualTypeOf<FunctionContext>()
      expectTypeOf(envelope.event).toEqualTypeOf<DocumentEvent>()
      expect(envelope.context).toEqual(context)
      expect(envelope.event).toEqual(event)
      expectTypeOf(envelope.event.data).toBeAny()
    })

    handler({context, event})
  })

  test('can pass data type as generic', () => {
    const handler = defineDocumentEventHandler<{foo: string}>((envelope) => {
      expectTypeOf(envelope.event.data).toEqualTypeOf<{foo: string}>()
      expect(envelope.event.data.foo).toBe('bar')
    })

    handler({context, event: {data: {foo: 'bar'}}})

    const unknownHandler = defineDocumentEventHandler<unknown>((envelope) => {
      expectTypeOf(envelope.event.data).toEqualTypeOf<unknown>()

      // @ts-expect-error accessing `foo` on unknown should fail
      expect(envelope.event.data.foo).toBe('bar')
    })

    unknownHandler({context, event})
  })
})
