import { env } from 'node:process'
import awsLite from '@aws-lite/client'
import type { FunctionInvokeParameters, FunctionResourceEnvelope } from '../types.js'

const aws = await awsLite({
    plugins: [import('@aws-lite/dynamodb'), import('@aws-lite/lambda'), import('@aws-lite/sns'), import('@aws-lite/sqs')],
})

const PARTITION_KEY = 'arc-app-res'

/**
 * Gets a specific resource based off of function name
 * @param {string} name
 */
async function getResource(name: string): Promise<FunctionResourceEnvelope> {
    const TableName = env['SANITY_DISCO']
    if (!TableName) throw new Error('SANITY_DISCO env var not set')
    if (!name) throw new Error('Function name was not provided')

    const result = await aws.DynamoDB.GetItem({
        TableName,
        Key: {
            PK: PARTITION_KEY,
            SK: name,
        },
        ProjectionExpression: 'resources',
    })
    if (!result?.Item) throw new Error(`Function not found: ${name}`)
    return result.Item['resources'] as FunctionResourceEnvelope
}

export async function invoke({ name, event }: FunctionInvokeParameters) {
    const resource = await getResource(name)

    if (resource.topic) {
        console.log('publishing a topic')
        await aws.SNS.Publish({
            TopicArn: resource.topic.physicalResourceId,
            Message: JSON.stringify(event),
        })
    } else if (resource.queue) {
        console.log('sending a message')
        await aws.SQS.SendMessage({
            MessageBody: JSON.stringify(event),
            QueueUrl: resource.queue.physicalResourceId,
            MessageGroupId: name,
        })
    } else if (resource.function) {
        console.log('calling a function')
        await aws.Lambda.Invoke({
            FunctionName: resource.function.physicalResourceId,
            Payload: { event },
        })
    } else {
        throw new Error(`No dispatchable resource for function: ${name}`)
    }
}
