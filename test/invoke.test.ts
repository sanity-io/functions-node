import awsLite from '@aws-lite/client'
import {beforeEach, describe, expect, test, vi} from 'vitest'
import type {ResourcesApi} from '../src'
import {invoke} from '../src/invoke.js'

const resources = {} as ResourcesApi
const context = {resources}

beforeEach(() => awsLite.testing.reset())

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
    expect(request.Payload).toEqual(payload)
  })

  test('invoke calls local function', async () => {
    const localInvoke = vi.fn()
    const payload = {event: {data: {hello: 'world'}}, context: {...context, local: true, invoke: localInvoke}}
    await invoke('my-fn', payload)

    expect(localInvoke).toHaveBeenCalledWith('my-fn', payload)
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
})
