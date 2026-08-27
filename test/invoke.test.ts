import {env} from 'node:process'
import awsLite from '@aws-lite/client'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import type {BlueprintResource, FunctionContext, GenericEvent, ResourcesApi} from '../src/index.js'
import {buildLineageToken, genID, invoke, MAX_RECURSION_COUNT} from '../src/index.js'

const fnName: string = 'my-fn'
const MAX_RECURSION_ERROR = `Function ${fnName} exceeded the maximum recursion depth of ${MAX_RECURSION_COUNT}`
const SANITY_FUNCTION_PUBSUB = 'sanity.function.pubsub'
const SANITY_FUNCTION_QUEUE = 'sanity.function.queue'
/** Function types that have no invoke path at all: neither sync nor async can reach them. */
const NON_INVOKEABLE_TYPES = ['sanity.function.cron', 'sanity.function.document', 'sanity.function.sync-tag-invalidate']
/** Every function type that is not an event function, i.e. the ones sync invokes must reject. */
const NON_EVENT_TYPES = [SANITY_FUNCTION_QUEUE, ...NON_INVOKEABLE_TYPES]

/** Builds a callable `ResourcesApi` backed by a fixed list of resources, like a deployed blueprint would. */
function makeResources(...list: BlueprintResource[]): ResourcesApi {
  const byName = (name: string) => list.find((resource) => resource.name === name)
  const byType = (prefix: string) => (name: string) => list.find((resource) => resource.name === name && resource.type.startsWith(prefix))
  return Object.assign(byName, {
    all: () => [...list],
    [Symbol.iterator]: () => list[Symbol.iterator](),
    cors: byType('sanity.cors'),
    dataset: byType('sanity.dataset'),
    function: byType('sanity.function'),
    project: byType('sanity.project'),
    role: byType('sanity.role'),
    webhook: byType('sanity.webhook'),
  }) as ResourcesApi
}

/** A context whose blueprint reports `fnName` as a function of the given type. */
function contextForType(type: string): FunctionContext {
  return {...defaultContext, resources: makeResources({id: 'fn-1', name: fnName, type})}
}

/** A context whose blueprint reports `name` as an event function, so the type guard lets it through. */
function contextForName(name: string): FunctionContext {
  return {...defaultContext, resources: makeResources({id: 'fn-1', name, type: SANITY_FUNCTION_PUBSUB})}
}

const resources = makeResources({id: 'fn-1', name: fnName, type: SANITY_FUNCTION_PUBSUB})
const defaultContext = {
  resources,
  eventResourceType: 'project',
  eventResourceId: '1234',
  functionResourceType: 'project',
  functionResourceId: '5678',
  clientOptions: {
    dataset: 'production',
    projectId: '5678',
    token: 'test-token',
  },
}
/** The env var the runtime uses to hand the caller's lineage token to the function. */
const LINEAGE_ENV = 'X_SANITY_LINEAGE'
/** The lineage the calling function is running under, as the runtime would set it. */
const CALLER_LINEAGE = 'abc:1'
/** The lineage `invoke` should put on the wire, one level below `CALLER_LINEAGE`. */
const NEXT_LINEAGE = 'abc:2'
let context: FunctionContext = defaultContext

/**
 * The payload `invoke` is expected to send: the caller's payload with the lineage read
 * from the environment and advanced. `invoke` copies rather than mutates, so the two
 * are never the same object.
 */
function outgoing<T extends {context: object}>(payload: T, lineage: string = NEXT_LINEAGE): T {
  return {...payload, context: {...payload.context, lineage}}
}

beforeEach(() => {
  awsLite.testing.reset()
  // The runtime, not the caller, tells a function what lineage it is running under
  vi.stubEnv(LINEAGE_ENV, CALLER_LINEAGE)
  // Each test gets its own copy
  context = {...defaultContext}
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('invoke', () => {
  test('invoke publishes to SNS topic', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke(fnName, payload)

    const {request} = awsLite.testing.getLastRequest('SNS.Publish')
    expect(request.TopicArn).toBe('arn:topic')
    expect(request.Message).toBe(JSON.stringify(outgoing(payload)))
  })

  test('invoke publishes to SQS queue', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })
    awsLite.testing.mock('SQS.SendMessage', {MessageId: 'm-1'})

    const payload = {event: {data: {hello: 'world'}}, context: contextForType(SANITY_FUNCTION_QUEUE)}
    await invoke(fnName, payload)

    const {request} = awsLite.testing.getLastRequest('SQS.SendMessage')
    expect(request.QueueUrl).toBe('https://my-queue')
    expect(request.MessageBody).toBe(JSON.stringify(outgoing(payload)))
  })

  test('invoke does not fall back to an async Lambda invoke', async () => {
    // An async invoke goes through the function's event source, never straight to the Lambda
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    await expect(invoke(fnName, {event: {data: {hello: 'world'}}, context})).rejects.toThrow(
      `No invokeable resource for function: ${fnName}`,
    )
    expect(awsLite.testing.getAllRequests('Lambda.Invoke')).toHaveLength(0)
  })

  test('invoke calls Lambda function synchronously', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke(fnName, payload, {sync: true})

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.FunctionName).toBe('arn:lambda:my-fn')
    expect(request.InvocationType).toBe('RequestResponse')
    expect(request.Payload).toEqual(outgoing(payload))
  })

  test('invoke throws when a sync target has no Lambda to call', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })

    await expect(invoke(fnName, {event: {data: {}}, context}, {sync: true})).rejects.toThrow(
      `Function ${fnName} cannot be invoked synchronously.`,
    )
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toBeUndefined()
  })

  test('invoke calls local function with the event data alone', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}
    await invoke(fnName, payload)

    // The CLI delivers what it is given as the target's `event.data` and builds the
    // target's context itself, so the envelope must not be passed along
    expect(localInvoke).toHaveBeenCalledWith(fnName, {hello: 'world'}, undefined)
  })

  test('invoke hands the local function an empty payload when the event carries no data', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {} as GenericEvent, context: {...context, local: true, invoke: localInvoke}}
    await invoke(fnName, payload)

    expect(localInvoke).toHaveBeenCalledWith(fnName, {}, undefined)
  })

  test('invoke forwards options to the local function', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}
    await invoke(fnName, payload, {sync: true})

    expect(localInvoke).toHaveBeenCalledWith(fnName, {hello: 'world'}, {sync: true})
  })

  test('invoke returns the local function result when invoked synchronously', async () => {
    const localInvoke = vi.fn().mockResolvedValue({status: 'ok'})
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}

    await expect(invoke(fnName, payload, {sync: true})).resolves.toEqual({status: 'ok'})
  })

  test('invoke rejects when the local function rejects', async () => {
    const localInvoke = vi.fn().mockRejectedValue(new Error('local handler blew up'))
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}

    await expect(invoke(fnName, payload, {sync: true})).rejects.toThrow('local handler blew up')
  })

  test('invoke throws when resource envelope has no invokeable target', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {Item: {resources: {}}})

    await expect(invoke(fnName, {event: {data: {hello: 'world'}}, context})).rejects.toThrow('No invokeable resource for function: my-fn')
  })

  test('invoke queries DynamoDB with the expected key shape', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})

    await invoke(fnName, {event: {data: {}}, context})

    const {request} = awsLite.testing.getLastRequest('DynamoDB.GetItem')
    expect(request.TableName).toBe('test-disco-table')
    expect(request.Key).toEqual({PK: 'arc-app-res', SK: fnName})
  })

  test('invoke throws when name is empty', async () => {
    await expect(invoke('', {event: {data: {}}, context})).rejects.toThrow('Function name was not provided')
  })

  test('invoke throws when function is not found in disco table', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {})

    await expect(invoke('missing-fn', {event: {data: {}}, context: contextForName('missing-fn')})).rejects.toThrow(
      'Function not found: missing-fn',
    )
  })

  test('invoke throws when function is found but missing resource', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {Item: {}})

    await expect(invoke('missing-resource', {event: {data: {}}, context: contextForName('missing-resource')})).rejects.toThrow(
      'Resource record for missing-resource is missing resources',
    )
  })

  test('invoke throws when event payload exceeds 256KB', async () => {
    const event = {data: {blob: 'a'.repeat(256 * 1024)}}
    await expect(invoke(fnName, {event, context})).rejects.toThrow('Payload exceeds maximum size of 256KB')
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toBeUndefined()
  })

  test('invoke throws when sync payload exceeds 6MB', async () => {
    const event = {data: {blob: 'a'.repeat(6 * 1024 * 1024)}}

    await expect(invoke(fnName, {event, context}, {sync: true})).rejects.toThrow('Payload exceeds maximum size of 6MB')
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toBeUndefined()
  })
})

describe('invoke sync is limited to event functions', () => {
  /** Point the disco table at a Lambda, the only resource a sync invoke can call. */
  function mockLambdaTarget() {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})
  }

  test(`allows a sync invoke of a ${SANITY_FUNCTION_PUBSUB} function`, async () => {
    mockLambdaTarget()

    await invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_PUBSUB)}, {sync: true})

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.InvocationType).toBe('RequestResponse')
  })

  test.each(NON_EVENT_TYPES)('rejects a sync invoke of a %s function', async (type) => {
    mockLambdaTarget()

    await expect(invoke(fnName, {event: {data: {}}, context: contextForType(type)}, {sync: true})).rejects.toThrow(
      `Function ${fnName} of type ${type} cannot be invoked synchronously.`,
    )
    expect(awsLite.testing.getAllRequests('Lambda.Invoke')).toHaveLength(0)
  })

  test('rejects a sync invoke when the blueprint does not know the function', async () => {
    mockLambdaTarget()
    // The lookup is by name, so a blueprint describing some other function tells us nothing about this one
    const unrelated = {...defaultContext, resources: makeResources({id: 'fn-2', name: 'other-fn', type: SANITY_FUNCTION_PUBSUB})}

    await expect(invoke(fnName, {event: {data: {}}, context: unrelated}, {sync: true})).rejects.toThrow(
      `Function ${fnName} cannot be invoked synchronously.`,
    )
    expect(awsLite.testing.getAllRequests('Lambda.Invoke')).toHaveLength(0)
  })

  test('rejects a sync invoke when the context carries no resources API', async () => {
    mockLambdaTarget()
    // An older runtime may not populate `resources`; without it the type cannot be confirmed
    const legacy = {...defaultContext, resources: undefined as unknown as ResourcesApi}

    await expect(invoke(fnName, {event: {data: {}}, context: legacy}, {sync: true})).rejects.toThrow(
      `Function ${fnName} cannot be invoked synchronously.`,
    )
    expect(awsLite.testing.getAllRequests('Lambda.Invoke')).toHaveLength(0)
  })

  test('reports the function type before looking up the sync target', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })

    await expect(invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_QUEUE)}, {sync: true})).rejects.toThrow(
      `Function ${fnName} of type ${SANITY_FUNCTION_QUEUE} cannot be invoked synchronously.`,
    )
    // The type alone settles it, so the disco table is never consulted
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toHaveLength(0)
  })

  test.each(NON_EVENT_TYPES)('rejects a local sync invoke of a %s function', async (type) => {
    // The type guard runs ahead of the local hand-off, so the Sanity CLI is never asked to run it
    const localInvoke = vi.fn()
    const context = {...contextForType(type), local: true, invoke: localInvoke}

    await expect(invoke(fnName, {event: {data: {}}, context}, {sync: true})).rejects.toThrow(
      `Function ${fnName} of type ${type} cannot be invoked synchronously.`,
    )
    expect(localInvoke).not.toHaveBeenCalled()
  })
})

describe('invoke async is limited to event and queue functions', () => {
  /** Point the disco table at an SNS topic, the event function's event source. */
  function mockTopicTarget() {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})
  }

  /** Point the disco table at an SQS queue, the queue function's event source. */
  function mockQueueTarget() {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })
    awsLite.testing.mock('SQS.SendMessage', {MessageId: 'm-1'})
  }

  test(`sends a ${SANITY_FUNCTION_PUBSUB} function to SNS`, async () => {
    mockTopicTarget()

    await invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_PUBSUB)})

    expect(awsLite.testing.getLastRequest('SNS.Publish').request.TopicArn).toBe('arn:topic')
  })

  test(`sends a ${SANITY_FUNCTION_QUEUE} function to SQS`, async () => {
    mockQueueTarget()

    await invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_QUEUE)})

    expect(awsLite.testing.getLastRequest('SQS.SendMessage').request.QueueUrl).toBe('https://my-queue')
  })

  test(`rejects a ${SANITY_FUNCTION_PUBSUB} function whose only resource is a queue`, async () => {
    // The type and the discovered resource have to agree, so an event function is never queued
    mockQueueTarget()

    await expect(invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_PUBSUB)})).rejects.toThrow(
      `No invokeable resource for function: ${fnName}`,
    )
    expect(awsLite.testing.getAllRequests('SQS.SendMessage')).toHaveLength(0)
  })

  test(`rejects a ${SANITY_FUNCTION_QUEUE} function whose only resource is a topic`, async () => {
    mockTopicTarget()

    await expect(invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_QUEUE)})).rejects.toThrow(
      `No invokeable resource for function: ${fnName}`,
    )
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toHaveLength(0)
  })

  test.each(NON_INVOKEABLE_TYPES)('rejects an async invoke of a %s function published over SNS', async (type) => {
    mockTopicTarget()

    await expect(invoke(fnName, {event: {data: {}}, context: contextForType(type)})).rejects.toThrow(
      `No invokeable resource for function: ${fnName}`,
    )
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toHaveLength(0)
  })

  test.each(NON_INVOKEABLE_TYPES)('rejects an async invoke of a %s function queued over SQS', async (type) => {
    mockQueueTarget()

    await expect(invoke(fnName, {event: {data: {}}, context: contextForType(type)})).rejects.toThrow(
      `No invokeable resource for function: ${fnName}`,
    )
    expect(awsLite.testing.getAllRequests('SQS.SendMessage')).toHaveLength(0)
  })

  test('rejects an async invoke when the blueprint does not know the function', async () => {
    mockTopicTarget()
    const unrelated = {...defaultContext, resources: makeResources({id: 'fn-2', name: 'other-fn', type: SANITY_FUNCTION_PUBSUB})}

    // An unknown function has no type to check, so it lands on the same error as a cron or document function
    await expect(invoke(fnName, {event: {data: {}}, context: unrelated})).rejects.toThrow(`No invokeable resource for function: ${fnName}`)
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toHaveLength(0)
  })

  test('rejects an async invoke when the context carries no resources API', async () => {
    mockTopicTarget()
    const legacy = {...defaultContext, resources: undefined as unknown as ResourcesApi}

    await expect(invoke(fnName, {event: {data: {}}, context: legacy})).rejects.toThrow(`No invokeable resource for function: ${fnName}`)
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toHaveLength(0)
  })

  test.each(NON_INVOKEABLE_TYPES)('rejects a local async invoke of a %s function', async (type) => {
    // The type guard runs ahead of the local hand-off, so the Sanity CLI is never asked to run it
    const localInvoke = vi.fn()
    const context = {...contextForType(type), local: true, invoke: localInvoke}

    await expect(invoke(fnName, {event: {data: {}}, context})).rejects.toThrow(`No invokeable resource for function: ${fnName}`)
    expect(localInvoke).not.toHaveBeenCalled()
  })
})

describe('genID', () => {
  test('generates a 32 character id by default', () => {
    expect(genID()).toHaveLength(32)
  })

  test('honours the requested length', () => {
    expect(genID(8)).toHaveLength(8)
    expect(genID(1)).toHaveLength(1)
    expect(genID(0)).toBe('')
  })

  test('only uses the unambiguous default alphabet', () => {
    // no `0` or `1` so ids stay readable when copied out of logs
    expect(genID(1024)).toMatch(/^[2-9a-z]+$/)
  })

  test('honours a custom alphabet', () => {
    expect(genID(16, 'ab')).toMatch(/^[ab]{16}$/)
  })

  test('generates a different id on each call', () => {
    const ids = new Set(Array.from({length: 100}, () => genID()))
    expect(ids.size).toBe(100)
  })
})

describe('buildLineageToken', () => {
  test('starts a new lineage when none is provided', () => {
    expect(buildLineageToken(fnName, undefined)).toMatch(/^[2-9a-z]{32}:1$/)
  })

  test('starts a new lineage when the token is empty', () => {
    expect(buildLineageToken(fnName, '')).toMatch(/^[2-9a-z]{32}:1$/)
  })

  test('increments the count of an existing token', () => {
    expect(buildLineageToken(fnName, 'abc:1')).toBe('abc:2')
    expect(buildLineageToken(fnName, 'abc:9')).toBe('abc:10')
  })

  test('keeps the id and starts counting when the token has no count', () => {
    expect(buildLineageToken(fnName, 'abc')).toBe('abc:1')
  })

  test('only treats the last segment as the count', () => {
    expect(buildLineageToken(fnName, 'abc:def:3')).toBe('abc:def:4')
  })

  test('trims surrounding whitespace', () => {
    expect(buildLineageToken(fnName, '  abc:2  ')).toBe('abc:3')
  })

  test('resets the count when it is not a positive integer', () => {
    expect(buildLineageToken(fnName, 'abc:nope')).toBe('abc:1')
    expect(buildLineageToken(fnName, 'abc:')).toBe('abc:1')
    expect(buildLineageToken(fnName, 'abc:-5')).toBe('abc:1')
  })

  test('truncates a fractional count', () => {
    expect(buildLineageToken(fnName, 'abc:2.7')).toBe('abc:3')
  })

  test('throws once the maximum recursion depth is reached', () => {
    expect(buildLineageToken(fnName, `abc:${MAX_RECURSION_COUNT - 1}`)).toBe(`abc:${MAX_RECURSION_COUNT}`)
    expect(() => buildLineageToken(fnName, `abc:${MAX_RECURSION_COUNT}`)).toThrow(MAX_RECURSION_ERROR)
    expect(() => buildLineageToken(fnName, 'abc:99')).toThrow(MAX_RECURSION_ERROR)
  })

  test('names the function that tripped the limit', () => {
    expect(() => buildLineageToken('other-fn', 'abc:99')).toThrow(
      `Function other-fn exceeded the maximum recursion depth of ${MAX_RECURSION_COUNT}`,
    )
  })
})

describe('invoke lineage', () => {
  /** Publishes to SNS and returns the payload the topic received. */
  async function publish(payload: Parameters<typeof invoke>[1]) {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})

    await invoke(fnName, payload)

    const {request} = awsLite.testing.getLastRequest('SNS.Publish')
    return JSON.parse(request.Message)
  }

  test('starts a new lineage when the environment has none', async () => {
    vi.stubEnv(LINEAGE_ENV, undefined)

    const sent = await publish({event: {data: {}}, context})

    expect(sent.context.lineage).toMatch(/^[2-9a-z]{32}:1$/)
  })

  test('increments the lineage token the environment carries', async () => {
    const sent = await publish({event: {data: {}}, context})

    expect(sent.context.lineage).toBe(NEXT_LINEAGE)
  })

  test('ignores a lineage token on the incoming context', async () => {
    // The runtime no longer populates `context.lineage`, so a stale one must not win over the env var
    const stale = {...defaultContext, lineage: 'stale:9'}

    const sent = await publish({event: {data: {}}, context: stale})

    expect(sent.context.lineage).toBe(NEXT_LINEAGE)
  })

  test('leaves the caller context and environment untouched', async () => {
    const payload = {event: {data: {}}, context}

    const sent = await publish(payload)

    expect(sent.context.lineage).toBe(NEXT_LINEAGE)
    expect(payload.context).toBe(context)
    expect('lineage' in payload.context).toBe(false)
    expect(env[LINEAGE_ENV]).toBe(CALLER_LINEAGE)
  })

  test('gives sibling invokes the same depth', async () => {
    const payload = {event: {data: {}}, context}

    // Both children are one level below the caller, so both are at depth 2
    expect((await publish(payload)).context.lineage).toBe(NEXT_LINEAGE)
    expect((await publish(payload)).context.lineage).toBe(NEXT_LINEAGE)
  })

  test('does not trip the recursion limit on a flat fan-out', async () => {
    const payload = {event: {data: {}}, context}

    // Fanning out to more than MAX_RECURSION_COUNT children involves no recursion at all
    for (let i = 0; i < MAX_RECURSION_COUNT + 4; i++) {
      expect((await publish(payload)).context.lineage).toBe(NEXT_LINEAGE)
    }
  })

  test('forwards the lineage token to SQS', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })
    awsLite.testing.mock('SQS.SendMessage', {MessageId: 'm-1'})

    await invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_QUEUE)})

    const {request} = awsLite.testing.getLastRequest('SQS.SendMessage')
    expect(JSON.parse(request.MessageBody).context.lineage).toBe(NEXT_LINEAGE)
  })

  test('forwards the lineage token to a synchronous Lambda invoke', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    await invoke(fnName, {event: {data: {}}, context}, {sync: true})

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.Payload.context.lineage).toBe(NEXT_LINEAGE)
  })

  test('does not send a context to the local invoke handler', async () => {
    // Locally the Sanity CLI derives the target's context, lineage included, from the
    // calling function's own context, so there is nothing for us to forward
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}

    await invoke(fnName, payload)

    expect(localInvoke.mock.calls[0][1]).toEqual({hello: 'world'})
  })

  test('rejects and skips the invoke once the recursion limit is hit', async () => {
    vi.stubEnv(LINEAGE_ENV, `abc:${MAX_RECURSION_COUNT}`)

    await expect(invoke(fnName, {event: {data: {}}, context})).rejects.toThrow(MAX_RECURSION_ERROR)
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toBeUndefined()
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toBeUndefined()
  })

  test('rejects before invoking a local function once the recursion limit is hit', async () => {
    vi.stubEnv(LINEAGE_ENV, `abc:${MAX_RECURSION_COUNT}`)
    const localInvoke = vi.fn()
    const payload = {event: {data: {}}, context: {...context, local: true, invoke: localInvoke}}

    await expect(invoke(fnName, payload)).rejects.toThrow(MAX_RECURSION_ERROR)
    expect(localInvoke).not.toHaveBeenCalled()
  })
})
