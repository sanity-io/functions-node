import awsLite from '@aws-lite/client'
import {beforeEach, describe, expect, test, vi} from 'vitest'
import type {FunctionContext, ResourcesApi} from '../src'
import {MAX_RECURSION_COUNT} from '../src'
import {buildLineageToken, genID, invoke} from '../src/invoke.js'

const MAX_RECURRSION_ERROR = `Maximum recursion depth of ${MAX_RECURSION_COUNT} exceeded`

const resources = {} as ResourcesApi
const defaultContext = {
  resources,
  eventResourceType: 'project',
  eventResourceId: '1234',
  functionResourceType: 'project',
  functionResourceId: '5678',
  clientOptions: {
    dataset: 'production',
    projectId: '5678',
  },
  lineage: 'abc:1',
}
let context: FunctionContext = defaultContext

beforeEach(() => {
  awsLite.testing.reset()
  // `invoke` mutates `context.lineage` in place, so hand each test its own copy
  context = {...defaultContext}
})

describe('invoke', () => {
  test('invoke publishes to SNS topic', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke('my-fn', payload)

    const {request} = awsLite.testing.getLastRequest('SNS.Publish')
    expect(request.TopicArn).toBe('arn:topic')
    expect(request.Message).toBe(JSON.stringify(payload))
  })

  test('invoke publishes to SQS queue', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })
    awsLite.testing.mock('SQS.SendMessage', {MessageId: 'm-1'})

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke('my-fn', payload)

    const {request} = awsLite.testing.getLastRequest('SQS.SendMessage')
    expect(request.QueueUrl).toBe('https://my-queue')
    expect(request.MessageBody).toBe(JSON.stringify(payload))
  })

  test('invoke calls Lambda function', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke('my-fn', payload)

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.FunctionName).toBe('arn:lambda:my-fn')
    expect(request.InvocationType).toBe('Event')
    expect(request.Payload).toEqual(payload)
  })

  test('invoke calls Lambda function synchronously', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    const payload = {event: {data: {hello: 'world'}}, context}
    await invoke('my-fn', payload, {sync: true})

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.FunctionName).toBe('arn:lambda:my-fn')
    expect(request.InvocationType).toBe('RequestResponse')
    expect(request.Payload).toEqual(payload)
  })

  test('invoke calls local function', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}
    await invoke('my-fn', payload)

    expect(localInvoke).toHaveBeenCalledWith('my-fn', payload, undefined)
  })

  test('invoke forwards options to the local function', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}
    await invoke('my-fn', payload, {sync: true})

    expect(localInvoke).toHaveBeenCalledWith('my-fn', payload, {sync: true})
  })

  test('invoke returns the local function result when invoked synchronously', async () => {
    const localInvoke = vi.fn().mockResolvedValue({status: 'ok'})
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}

    await expect(invoke('my-fn', payload, {sync: true})).resolves.toEqual({status: 'ok'})
  })

  test('invoke rejects when the local function rejects', async () => {
    const localInvoke = vi.fn().mockRejectedValue(new Error('local handler blew up'))
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}

    await expect(invoke('my-fn', payload, {sync: true})).rejects.toThrow('local handler blew up')
  })

  test('invoke throws when resource envelope has no invokeable target', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {Item: {resources: {}}})

    await expect(invoke('my-fn', {event: {data: {hello: 'world'}}, context})).rejects.toThrow('No invokeable resource for function: my-fn')
  })

  test('invoke queries DynamoDB with the expected key shape', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})

    await invoke('my-fn', {event: {data: {}}, context})

    const {request} = awsLite.testing.getLastRequest('DynamoDB.GetItem')
    expect(request.TableName).toBe('test-disco-table')
    expect(request.Key).toEqual({PK: 'arc-app-res', SK: 'my-fn'})
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
    await expect(invoke('my-fn', {event, context})).rejects.toThrow('Payload exceeds maximum size of 256KB')
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toBeUndefined()
  })

  test('invoke throws when sync payload exceeds 6MB', async () => {
    const event = {data: {blob: 'a'.repeat(6 * 1024 * 1024)}}

    await expect(invoke('my-fn', {event, context}, {sync: true})).rejects.toThrow('Payload exceeds maximum size of 6MB')
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toBeUndefined()
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
    expect(buildLineageToken(undefined)).toMatch(/^[2-9a-z]{32}:1$/)
  })

  test('starts a new lineage when the token is empty', () => {
    expect(buildLineageToken('')).toMatch(/^[2-9a-z]{32}:1$/)
  })

  test('increments the count of an existing token', () => {
    expect(buildLineageToken('abc:1')).toBe('abc:2')
    expect(buildLineageToken('abc:9')).toBe('abc:10')
  })

  test('keeps the id and starts counting when the token has no count', () => {
    expect(buildLineageToken('abc')).toBe('abc:1')
  })

  test('only treats the last segment as the count', () => {
    expect(buildLineageToken('abc:def:3')).toBe('abc:def:4')
  })

  test('trims surrounding whitespace', () => {
    expect(buildLineageToken('  abc:2  ')).toBe('abc:3')
  })

  test('resets the count when it is not a positive integer', () => {
    expect(buildLineageToken('abc:nope')).toBe('abc:1')
    expect(buildLineageToken('abc:')).toBe('abc:1')
    expect(buildLineageToken('abc:-5')).toBe('abc:1')
  })

  test('truncates a fractional count', () => {
    expect(buildLineageToken('abc:2.7')).toBe('abc:3')
  })

  test('throws once the maximum recursion depth is reached', () => {
    expect(buildLineageToken('abc:15')).toBe('abc:16')
    expect(() => buildLineageToken('abc:16')).toThrow(MAX_RECURRSION_ERROR)
    expect(() => buildLineageToken('abc:99')).toThrow(MAX_RECURRSION_ERROR)
  })
})

describe('invoke lineage', () => {
  /** Publishes to SNS and returns the payload the topic received. */
  async function publish(payload: Parameters<typeof invoke>[1]) {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {topic: {logicalResourceId: 'foo', physicalResourceId: 'arn:topic'}}},
    })
    awsLite.testing.mock('SNS.Publish', {MessageId: 'm-1'})

    await invoke('my-fn', payload)

    const {request} = awsLite.testing.getLastRequest('SNS.Publish')
    return JSON.parse(request.Message)
  }

  test('adds a lineage token when the context has none', async () => {
    const {lineage, ...rest} = context
    const sent = await publish({event: {data: {}}, context: rest as FunctionContext})

    expect(sent.context.lineage).toMatch(/^[2-9a-z]{32}:1$/)
    expect(lineage).toBe('abc:1')
  })

  test('increments the lineage token when the context already has one', async () => {
    const sent = await publish({event: {data: {}}, context})

    expect(sent.context.lineage).toBe('abc:2')
  })

  test('mutates the caller context so the token survives repeat invokes', async () => {
    const payload = {event: {data: {}}, context}

    await publish(payload)
    expect(payload.context.lineage).toBe('abc:2')

    await publish(payload)
    expect(payload.context.lineage).toBe('abc:3')
  })

  test('forwards the lineage token to SQS', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {queue: {logicalResourceId: 'foo', physicalResourceId: 'https://my-queue'}}},
    })
    awsLite.testing.mock('SQS.SendMessage', {MessageId: 'm-1'})

    await invoke('my-fn', {event: {data: {}}, context})

    const {request} = awsLite.testing.getLastRequest('SQS.SendMessage')
    expect(JSON.parse(request.MessageBody).context.lineage).toBe('abc:2')
  })

  test('forwards the lineage token to a synchronous Lambda invoke', async () => {
    awsLite.testing.mock('DynamoDB.GetItem', {
      Item: {resources: {function: {logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn'}}},
    })
    awsLite.testing.mock('Lambda.Invoke', {StatusCode: 200})

    await invoke('my-fn', {event: {data: {}}, context}, {sync: true})

    const {request} = awsLite.testing.getLastRequest('Lambda.Invoke')
    expect(request.Payload.context.lineage).toBe('abc:2')
  })

  test('forwards the lineage token to the local invoke handler', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {}}, context: {...context, local: true, invoke: localInvoke}}

    await invoke('my-fn', payload)

    expect(localInvoke.mock.calls[0][1].context.lineage).toBe('abc:2')
  })

  test('rejects and skips the invoke once the recursion limit is hit', async () => {
    await expect(invoke('my-fn', {event: {data: {}}, context: {...context, lineage: `abc:${MAX_RECURSION_COUNT}`}})).rejects.toThrow(
      MAX_RECURRSION_ERROR,
    )
    expect(awsLite.testing.getAllRequests('DynamoDB.GetItem')).toBeUndefined()
    expect(awsLite.testing.getAllRequests('SNS.Publish')).toBeUndefined()
  })

  test('rejects before invoking a local function once the recursion limit is hit', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {}}, context: {...context, lineage: `abc:${MAX_RECURSION_COUNT}`, local: true, invoke: localInvoke}}

    await expect(invoke('my-fn', payload)).rejects.toThrow(MAX_RECURRSION_ERROR)
    expect(localInvoke).not.toHaveBeenCalled()
  })
})
