import {describe, expectTypeOf, test} from 'vitest'
import type {FunctionContext, InvokedBy, ResourcesApi} from '../src/index.js'

const base = {
  eventResourceId: 'abc123.xyz789',
  eventResourceType: 'dataset',
  functionResourceId: 'abc123',
  functionResourceType: 'project',
  clientOptions: {projectId: 'abc123', dataset: 'xyz789', token: 'sk_test'},
  resources: {} as ResourcesApi,
} satisfies FunctionContext

describe('FunctionContext.invokedBy', () => {
  test('is an optional InvokedBy', () => {
    expectTypeOf<FunctionContext['invokedBy']>().toEqualTypeOf<InvokedBy | undefined>()
  })

  test('InvokedBy carries a string userId', () => {
    expectTypeOf<InvokedBy>().toEqualTypeOf<{userId: string}>()
  })

  test('context is valid with or without invokedBy', () => {
    const without: FunctionContext = base
    const withInvoker: FunctionContext = {...base, invokedBy: {userId: 'u1'}}
    expectTypeOf(without.invokedBy).toEqualTypeOf<InvokedBy | undefined>()
    expectTypeOf(withInvoker.invokedBy).toEqualTypeOf<InvokedBy | undefined>()
  })

  test('rejects an invalid invokedBy', () => {
    // @ts-expect-error userId must be a string
    const bad: FunctionContext = {...base, invokedBy: {userId: 123}}
    // @ts-expect-error userId is required when invokedBy is present
    const missing: FunctionContext = {...base, invokedBy: {}}
    void bad
    void missing
  })
})
