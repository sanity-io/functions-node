import awsLite from '@aws-lite/client'
import { beforeEach, describe, expect, test } from 'vitest'
import { invoke } from '../src/invoke/index.js'

beforeEach(() => awsLite.testing.reset())

describe('invoke', () => {
    test('invoke publishes to SNS topic', async () => {
        awsLite.testing.mock('DynamoDB.GetItem', {
            Item: { resources: { topic: { logicalResourceId: 'foo', physicalResourceId: 'arn:topic' } } },
        })
        awsLite.testing.mock('SNS.Publish', { MessageId: 'm-1' })

        const event = { hello: 'world' }
        await invoke({ name: 'my-fn', event })

        const { request } = awsLite.testing.getLastRequest('SNS.Publish')
        expect(request.TopicArn).toBe('arn:topic')
        expect(request.Message).toBe(JSON.stringify(event))
    })

    test('invoke publishes to SQS queue', async () => {
        awsLite.testing.mock('DynamoDB.GetItem', {
            Item: { resources: { queue: { logicalResourceId: 'foo', physicalResourceId: 'https://my-queue' } } },
        })
        awsLite.testing.mock('SQS.SendMessage', { MessageId: 'm-1' })

        const event = { hello: 'world' }
        await invoke({ name: 'my-fn', event })

        const { request } = awsLite.testing.getLastRequest('SQS.SendMessage')
        expect(request.QueueUrl).toBe('https://my-queue')
        expect(request.MessageBody).toBe(JSON.stringify(event))
        expect(request.MessageGroupId).toBe('my-fn')
    })

    test('invoke calls Lambda function', async () => {
        awsLite.testing.mock('DynamoDB.GetItem', {
            Item: { resources: { function: { logicalResourceId: 'foo', physicalResourceId: 'arn:lambda:my-fn' } } },
        })
        awsLite.testing.mock('Lambda.Invoke', { StatusCode: 200 })

        const event = { hello: 'world' }
        await invoke({ name: 'my-fn', event })

        const { request } = awsLite.testing.getLastRequest('Lambda.Invoke')
        expect(request.FunctionName).toBe('arn:lambda:my-fn')
        expect(request.Payload).toEqual({ event })
    })

    test('invoke throws when resource envelope has no dispatchable target', async () => {
        awsLite.testing.mock('DynamoDB.GetItem', { Item: { resources: {} } })

        await expect(invoke({ name: 'my-fn', event: { hello: 'world' } })).rejects.toThrow(
            'No dispatchable resource for function: my-fn',
        )

    })

    test('invoke queries DynamoDB with the expected key shape', async () => {
        awsLite.testing.mock('DynamoDB.GetItem', {
            Item: { resources: { topic: { logicalResourceId: 'foo', physicalResourceId: 'arn:topic' } } },
        })
        awsLite.testing.mock('SNS.Publish', { MessageId: 'm-1' })

        await invoke({ name: 'my-fn', event: {} })

        const { request } = awsLite.testing.getLastRequest('DynamoDB.GetItem')
        expect(request.TableName).toBe('test-disco-table')
        expect(request.Key).toEqual({ PK: 'arc-app-res', SK: 'my-fn' })
    })

    test('invoke throws when name is empty', async () => {
        await expect(invoke({ name: '', event: {} })).rejects.toThrow('Function name was not provided')
    })

    test('invoke throws when function is not found in disco table', async () => {
        awsLite.testing.mock('DynamoDB.GetItem', {})

        await expect(invoke({ name: 'missing-fn', event: {} })).rejects.toThrow('Function not found: missing-fn')
    })
})

