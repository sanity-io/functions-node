import awsLite from '@aws-lite/client'
import {beforeEach, describe, expect, test, vi} from 'vitest'
import type {BlueprintResource, FunctionContext, ResourcesApi} from '../src'
import {MAX_RECURSION_COUNT} from '../src'
import {buildLineageToken, genID, invoke} from '../src/invoke.js'

const fnName: string = 'my-fn'
const MAX_RECURSION_ERROR = `Function ${fnName} exceeded the maximum recursion depth of ${MAX_RECURSION_COUNT}`
const SANITY_FUNCTION_EVENT = 'sanity.function.event'
/** Every function type that is not an event function, i.e. the ones sync invokes must reject. */
const NON_EVENT_TYPES = ['sanity.function.cron', 'sanity.function.document', 'sanity.function.sync-tag-invalidate']

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

const resources = makeResources({id: 'fn-1', name: fnName, type: SANITY_FUNCTION_EVENT})
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
  lineage: 'abc:1',
}
/** The lineage `defaultContext` should carry once `invoke` has advanced it. */
const NEXT_LINEAGE = 'abc:2'
let context: FunctionContext = defaultContext

/**
 * The payload `invoke` is expected to send: the caller's payload with the lineage
 * advanced. `invoke` copies rather than mutates, so the two are never the same object.
 */
function outgoing<T extends {context: object}>(payload: T, lineage: string = NEXT_LINEAGE): T {
  return {...payload, context: {...payload.context, lineage}}
}

beforeEach(() => {
  awsLite.testing.reset()
  // Each test gets its own copy
  context = {...defaultContext}
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

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke(fnName, payload)

    const {request} = awsLite.testing.getLastRequest('SQS.SendMessage')
    expect(request.QueueUrl).toBe('https://my-queue')
    expect(request.MessageBody).toBe(JSON.stringify(outgoing(payload)))
  })

  test('invoke calls Lambda function', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke(fnName, payload)

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.FunctionName).toBe('arn:lambda:my-fn')
    expect(request.InvocationType).toBe('Event')
    expect(request.Payload).toEqual(outgoing(payload))
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

  test('invoke calls local function', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}
    await invoke(fnName, payload)

    expect(localInvoke).toHaveBeenCalledWith(fnName, outgoing(payload), undefined)
  })

  test('invoke forwards options to the local function', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}
    await invoke(fnName, payload, {sync: true})

    expect(localInvoke).toHaveBeenCalledWith(fnName, outgoing(payload), {sync: true})
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

    await expect(invoke('missing-fn', {event: {data: {}}, context})).rejects.toThrow('Function not found: missing-fn')
  })

  test('invoke throws when function is found but missing resource', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {Item: {}})

    await expect(invoke('missing-resource', {event: {data: {}}, context})).rejects.toThrow(
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

  test(`allows a sync invoke of a ${SANITY_FUNCTION_EVENT} function`, async () => {
    mockLambdaTarget()

    await invoke(fnName, {event: {data: {}}, context: contextForType(SANITY_FUNCTION_EVENT)}, {sync: true})

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
    const unrelated = {...defaultContext, resources: makeResources({id: 'fn-2', name: 'other-fn', type: SANITY_FUNCTION_EVENT})}

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

  test('reports the missing sync target before the function type', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })

    await expect(invoke(fnName, {event: {data: {}}, context: contextForType('sanity.function.scheduled')}, {sync: true})).rejects.toThrow(
      `Function ${fnName} cannot be invoked synchronously.`,
    )
  })

  test.each(NON_EVENT_TYPES)('still allows an async invoke of a %s function', async (type) => {
    mockLambdaTarget()

    await invoke(fnName, {event: {data: {}}, context: contextForType(type)})

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.InvocationType).toBe('Event')
  })

  test.each(NON_EVENT_TYPES)('still allows an async invoke of a %s function over SNS', async (type) => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})

    await invoke(fnName, {event: {data: {}}, context: contextForType(type)})

    expect(awsLite.testing.getLastRequest('SNS.Publish').request.TopicArn).toBe('arn:topic')
  })

  test.each(NON_EVENT_TYPES)('leaves the %s guard to the CLI when running locally', async (type) => {
    // Local runs never reach the disco table, so the Sanity CLI decides what it can invoke
    const localInvoke = vi.fn()
    const context = {...contextForType(type), local: true, invoke: localInvoke}

    await invoke(fnName, {event: {data: {}}, context}, {sync: true})

    expect(localInvoke).toHaveBeenCalledTimes(1)
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

  test('adds a lineage token when the context has none', async () => {
    const bare: FunctionContext = {...defaultContext}
    delete bare.lineage

    const sent = await publish({event: {data: {}}, context: bare})

    expect(sent.context.lineage).toMatch(/^[2-9a-z]{32}:1$/)
    expect(bare.lineage).toBeUndefined()
  })

  test('increments the lineage token when the context already has one', async () => {
    const sent = await publish({event: {data: {}}, context})

    expect(sent.context.lineage).toBe('abc:2')
  })

  test('leaves the caller context untouched', async () => {
    const payload = {event: {data: {}}, context}

    const sent = await publish(payload)

    expect(sent.context.lineage).toBe('abc:2')
    expect(payload.context.lineage).toBe('abc:1')
    expect(payload.context).toBe(context)
  })

  test('gives sibling invokes the same depth', async () => {
    const payload = {event: {data: {}}, context}

    // Both children are one level below the caller, so both are at depth 2
    expect((await publish(payload)).context.lineage).toBe('abc:2')
    expect((await publish(payload)).context.lineage).toBe('abc:2')
  })

  test('does not trip the recursion limit on a flat fan-out', async () => {
    const payload = {event: {data: {}}, context}

    // Fanning out to more than MAX_RECURSION_COUNT children involves no recursion at all
    for (let i = 0; i < MAX_RECURSION_COUNT + 4; i++) {
      expect((await publish(payload)).context.lineage).toBe('abc:2')
    }
  })

  test('forwards the lineage token to SQS', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })
    awsLite.testing.mock('SQS.SendMessage', {MessageId: 'm-1'})

    await invoke(fnName, {event: {data: {}}, context})

    const {request} = awsLite.testing.getLastRequest('SQS.SendMessage')
    expect(JSON.parse(request.MessageBody).context.lineage).toBe('abc:2')
  })

  test('forwards the lineage token to a synchronous Lambda invoke', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    await invoke(fnName, {event: {data: {}}, context}, {sync: true})

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.Payload.context.lineage).toBe('abc:2')
  })

  test('forwards the lineage token to the local invoke handler', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {}}, context: {...context, local: true, invoke: localInvoke}}

    await invoke(fnName, payload)

    expect(localInvoke.mock.calls[0][1].context.lineage).toBe('abc:2')
  })

  test('rejects and skips the invoke once the recursion limit is hit', async () => {
    await expect(invoke(fnName, {event: {data: {}}, context: {...context, lineage: `abc:${MAX_RECURSION_COUNT}`}})).rejects.toThrow(
      MAX_RECURSION_ERROR,
    )
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toBeUndefined()
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toBeUndefined()
  })

  test('rejects before invoking a local function once the recursion limit is hit', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {}}, context: {...context, lineage: `abc:${MAX_RECURSION_COUNT}`, local: true, invoke: localInvoke}}

    await expect(invoke(fnName, payload)).rejects.toThrow(MAX_RECURSION_ERROR)
    expect(localInvoke).not.toHaveBeenCalled()
  })
})
