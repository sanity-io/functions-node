import {Buffer} from 'node:buffer'
import {env} from 'node:process'
import type awsLite from '@aws-lite/client'
import type {FunctionPayload, FunctionResourceEnvelope, InvokeOptions} from './types.js'

let awsPromise: Promise<awsLite.AwsLiteClient> | undefined

const PARTITION_KEY = 'arc-app-res'

/**
 * lazy load aws-lite
 */
function getAwsLite() {
  if (!awsPromise) {
    awsPromise = (async () => {
      const {default: awsLite} = await import('@aws-lite/client')
      return awsLite({
        plugins: [import('@aws-lite/dynamodb'), import('@aws-lite/lambda'), import('@aws-lite/sns'), import('@aws-lite/sqs')],
      })
    })().catch((err) => {
      awsPromise = undefined
      throw err
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
  if (!result.Item['resources']) throw new Error(`Resource record for ${name} is missing resources`)
  return result.Item['resources'] as unknown as FunctionResourceEnvelope
}

/**
 * Invokes another Sanity Function.
 *
 * By default the invocation is async: the payload is handed off to the function's
 * event source and nothing is returned. Pass `{sync: true}` to invoke the function and
 * wait for its return value.
 *
 * @param name - Name of the function to invoke
 * @param payload - The `{event, context}` envelope to deliver
 * @param options - Set `sync: true` to wait for and return the function's result
 */
export async function invoke<T = unknown>(name: string, payload: FunctionPayload, options: InvokeOptions & {sync: true}): Promise<T>
export async function invoke(name: string, payload: FunctionPayload, options?: InvokeOptions): Promise<void>
export async function invoke(name: string, payload: FunctionPayload, options?: InvokeOptions): Promise<unknown> {
  if (!name) throw new Error('Function name was not provided')
  const sync = options?.sync ?? false

  const stringPayload = JSON.stringify(payload)
  // Check to make sure payload is not over the max we can handle
  checkPayloadSize(stringPayload, sync)

  // Local invoke path for Sanity CLI
  if (payload?.context?.local) {
    if (!payload?.context?.invoke) {
      throw new Error(`No local invoke handler configured for function: ${name}`)
    }
    return await payload.context.invoke(name, payload, options)
  }

  const aws = await getAwsLite()
  if (!aws) throw new Error(`Unable to invoke function: ${name}`)

  // Look up the function details
  const resource = await getResource(name, aws)

  // Synchronous invocation
  if (sync === true) {
    if (!resource.function) {
      throw new Error(`Function ${name} cannot be invoked synchronously.`)
    }
    const {Payload, FunctionError} = await aws.Lambda.Invoke({
      FunctionName: resource.function.physicalResourceId,
      Payload: payload,
      InvocationType: 'RequestResponse',
    })
    if (FunctionError) {
      const detail = typeof Payload === 'object' && Payload !== null ? (Payload as {errorMessage?: string}).errorMessage : undefined
      throw new Error(`Function ${name} failed: ${detail ?? FunctionError}`)
    }
    return Payload
  }

  // Async invocation by type
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
  return
}

function checkPayloadSize(payload: string, sync: boolean) {
  if (sync) {
    if (Buffer.byteLength(payload, 'utf8') > 6 * 1024 * 1024) {
      throw new Error(`Payload exceeds maximum size of 6MB`)
    }
  } else {
    if (Buffer.byteLength(payload, 'utf8') > 256 * 1024) {
      throw new Error(`Payload exceeds maximum size of 256KB`)
    }
  }
}
