import {assertType, describe, expect, expectTypeOf, test} from 'vitest'
import {
  type BlueprintResource,
  type DocumentEvent,
  type DocumentEventHandler,
  documentEventHandler,
  type EventHandler,
  eventHandler,
  type FunctionContext,
  type GenericContext,
  type ResourcesApi,
  type ScheduledEventHandler,
  type ScheduledFunctionContext,
  type SyncTagInvalidateCallback,
  type SyncTagInvalidateContext,
  type SyncTagInvalidateEvent,
  type SyncTagInvalidateEventHandler,
  scheduledEventHandler,
  syncTagInvalidateEventHandler,
} from '../src'

const mockResourcesApi = (resources: BlueprintResource[] = []): ResourcesApi => {
  const findByName = (name: string) => resources.find((r) => r.name === name)
  const all = () => resources

  return new Proxy(findByName, {
    get: (_target, prop) => {
      if (prop === 'all') return all
      if (prop === Symbol.iterator) {
        return function* () {
          yield* all()
        }
      }
      if (typeof prop !== 'string' || prop === 'then') return undefined
      return (name: string) => resources.find((r) => r.type === prop && r.name === name)
    },
  }) as unknown as ResourcesApi
}

const documentContext: FunctionContext = {
  eventResourceId: 'abc123.xyz789',
  eventResourceType: 'dataset',
  functionResourceId: 'abc123',
  functionResourceType: 'project',
  clientOptions: {projectId: 'abc123', dataset: 'xyz789', token: 'sk_some-token'},
  resources: mockResourcesApi(),
}

const scheduledContext: ScheduledFunctionContext = {
  local: true,
  resources: mockResourcesApi(),
}

const syncTagContext: SyncTagInvalidateContext = {
  callbackToken: 'supersecret',
  eventResourceId: 'abc123.xyz789',
  eventResourceType: 'dataset',
  functionResourceId: 'abc123',
  functionResourceType: 'project',
  clientOptions: {apiHost: 'api.sanity.io', projectId: 'abc123', dataset: 'xyz789'},
  resources: mockResourcesApi(),
}

const documentEvent: DocumentEvent = {data: {_id: 'docId', _type: 'docType'}}
const syncTagEvent: SyncTagInvalidateEvent = {data: {syncTags: ['abc:123', 'def:456']}}
const done: SyncTagInvalidateCallback = async (_syncTags) => new Response()

describe('documentEventHandler', () => {
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
      expect(envelope.context).toEqual(documentContext)
      expect(envelope.event).toEqual(documentEvent)
      expectTypeOf(envelope.event.data).toBeAny()
    })

    handler({context: documentContext, event: documentEvent})
  })

  test('can pass data type as generic', () => {
    const handler = documentEventHandler<{foo: string}>((envelope) => {
      expectTypeOf(envelope.event.data).toEqualTypeOf<{foo: string}>()
      expect(envelope.event.data.foo).toBe('bar')
    })

    handler({context: documentContext, event: {data: {foo: 'bar'}}})

    const unknownHandler = documentEventHandler<unknown>((envelope) => {
      expectTypeOf(envelope.event.data).toEqualTypeOf<unknown>()

      // @ts-expect-error accessing `foo` on unknown should fail
      expect(envelope.event.data.foo).toBe('bar')
    })

    unknownHandler({context: documentContext, event: documentEvent})
  })
})

describe('scheduledEventHandler', () => {
  test('has correct type signature', () => {
    expectTypeOf(scheduledEventHandler).toBeFunction()
    expectTypeOf(scheduledEventHandler).parameter(0).toExtend<ScheduledEventHandler>()
    expectTypeOf(scheduledEventHandler).returns.toExtend<ScheduledEventHandler>()

    // @ts-expect-error should be a function
    assertType(scheduledEventHandler('foo'))
  })

  test('handler envelope has correct types', () => {
    const handler = scheduledEventHandler((envelope) => {
      expectTypeOf(envelope.context).toEqualTypeOf<ScheduledFunctionContext>()
      expect(envelope.context).toEqual(scheduledContext)
    })

    handler({context: scheduledContext})
  })

  test('runs a handler', async () => {
    const handler: ScheduledEventHandler = () => {
      return Promise.resolve()
    }

    await expect(handler({context: scheduledContext})).resolves.toBeUndefined()
  })
})

describe('syncTagInvalidateEventHandler', () => {
  test('has correct type signature', () => {
    expectTypeOf(syncTagInvalidateEventHandler).toBeFunction()
    expectTypeOf(syncTagInvalidateEventHandler).parameter(0).toExtend<SyncTagInvalidateEventHandler>()
    expectTypeOf(syncTagInvalidateEventHandler).returns.toExtend<SyncTagInvalidateEventHandler>()

    // @ts-expect-error should be a function
    assertType(syncTagInvalidateEventHandler('foo'))
  })

  test('handler envelope has correct types', () => {
    const handler = syncTagInvalidateEventHandler((envelope) => {
      expectTypeOf(envelope.context).toEqualTypeOf<SyncTagInvalidateContext>()
      expectTypeOf(envelope.event).toEqualTypeOf<SyncTagInvalidateEvent>()
      expectTypeOf(envelope.done).toEqualTypeOf<SyncTagInvalidateCallback>()
      expect(envelope.context).toEqual(syncTagContext)
      expect(envelope.event).toEqual(syncTagEvent)
      expectTypeOf(envelope.event.data.syncTags).toBeArray()
    })

    handler({context: syncTagContext, done, event: syncTagEvent})
  })
})

describe('eventHandler', () => {
  test('has correct type signature', () => {
    expectTypeOf(eventHandler).toBeFunction()
    expectTypeOf(eventHandler).parameter(0).toExtend<EventHandler>()
    expectTypeOf(eventHandler).returns.toExtend<EventHandler>()

    // @ts-expect-error should be a function
    assertType(eventHandler('foo'))
  })

  test('has a permissive envelope that needs no narrowing', () => {
    const handler = eventHandler((envelope) => {
      // `context`/`event` accept any supported shape, `done` is optional
      expectTypeOf(envelope.context).toEqualTypeOf<GenericContext>()
      expectTypeOf(envelope.event).toEqualTypeOf<DocumentEvent | SyncTagInvalidateEvent>()
      expectTypeOf(envelope.done).toEqualTypeOf<SyncTagInvalidateCallback | undefined>()
      // event data is `any` by default, so it can be accessed without a guard
      expectTypeOf(envelope.event.data).toBeAny()
    })

    handler({context: documentContext, event: documentEvent})
    handler({context: syncTagContext, event: syncTagEvent, done})
  })

  test('can pass data type as generic for the document payload', () => {
    const handler = eventHandler<{foo: string}>((envelope) => {
      expectTypeOf(envelope.event).toEqualTypeOf<DocumentEvent<{foo: string}> | SyncTagInvalidateEvent>()
    })

    handler({context: documentContext, event: {data: {foo: 'bar'}}})
  })
})
