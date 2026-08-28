import {describe, expectTypeOf, test} from 'vitest'
import type {FunctionPayload, ResourcesApi} from '../src/index.js'
import {invoke} from '../src/index.js'

const payload = {event: {data: {hello: 'world'}}, context: {resources: {} as ResourcesApi}} as FunctionPayload

describe('invoke', () => {
  test('resolves to void when invoked asynchronously', () => {
    // The async overload must stay `void`: returning the underlying SNS/SQS/Lambda responses
    // would pull `@aws-sdk/*` types into the emitted declarations, and those packages are
    // devDependencies only, so they do not resolve for consumers.
    expectTypeOf(invoke('my-fn', payload)).toEqualTypeOf<Promise<void>>()
    expectTypeOf(invoke('my-fn', payload, {})).toEqualTypeOf<Promise<void>>()
    expectTypeOf(invoke('my-fn', payload, {sync: false})).toEqualTypeOf<Promise<void>>()
  })

  test('resolves to unknown by default when invoked synchronously', () => {
    expectTypeOf(invoke('my-fn', payload, {sync: true})).toEqualTypeOf<Promise<unknown>>()
  })

  test('resolves to the asserted type when a generic is supplied', () => {
    expectTypeOf(invoke<{id: string}>('my-fn', payload, {sync: true})).toEqualTypeOf<Promise<{id: string}>>()
  })
})
