import {Buffer} from 'node:buffer'
import {env} from 'node:process'
import awsLite from '@aws-lite/client'
import type {FunctionPayload, FunctionResourceEnvelope} from './types.js'

const MAX_EVENT_SIZE_BYTES = 256 * 1024

let awsPromise: ReturnType<typeof awsLite> | undefined

const PARTITION_KEY = 'arc-app-res'

/**
 * lazy load aws-lite
 */
function getAwsLite() {
  if (!awsPromise) {
    awsPromise = awsLite({
      plugins: [import('@aws-lite/dynamodb'), import('@aws-lite/lambda'), import('@aws-lite/sns'), import('@aws-lite/sqs')],
    })
  }
  return awsPromise
}
/**
 * Gets a specific resource based off of function name
 * @param {string} name
 */
async function getResource(name: string, aws: awsLite.AwsLiteClient): Promise<FunctionResourceEnvelope> {
  const TableName = env['SANITY_DISCO']
  if (!TableName) throw new Error('SANITY_DISCO env var not set')

  const result = await aws.DynamoDB.GetItem({
    TableName,
    Key: {
      PK: PARTITION_KEY,
      SK: name,
    },
    ProjectionExpression: 'resources',
  })
  if (!result?.Item) throw new Error(`Function not found: ${name}`)
  return result.Item['resources'] as unknown as FunctionResourceEnvelope
}

export async function invoke(name: string, payload: FunctionPayload) {
  if (!name) throw new Error('Function name was not provided')

  const aws = await getAwsLite()
  if (!aws) throw new Error(`Unable to invoke function: ${name}`)

  const stringPayload = JSON.stringify(payload)
  // Check to make sure payload is not over the max we can handle
  if (Buffer.byteLength(stringPayload, 'utf8') > MAX_EVENT_SIZE_BYTES) {
    throw new Error(`Payload exceeds maximum size of ${MAX_EVENT_SIZE_BYTES / 1024}KB`)
  }

  // Look up the function details
  const resource = await getResource(name, aws)

  // Determine which method to invoke the function
  if (resource.topic) {
    await aws.SNS.Publish({
      TopicArn: resource.topic.physicalResourceId,
      Message: stringPayload,
    })
  } else if (resource.queue) {
    await aws.SQS.SendMessage({
      MessageBody: stringPayload,
      QueueUrl: resource.queue.physicalResourceId,
    })
  } else if (resource.function) {
    await aws.Lambda.Invoke({
      FunctionName: resource.function.physicalResourceId,
      Payload: payload,
      InvocationType: 'Event',
    })
  } else {
    throw new Error(`No invokeable resource for function: ${name}`)
  }
}
