import {describe, expect, test} from 'vitest'
import {
  type DocumentEventHandler,
  documentEventHandler,
  type ScheduledEventHandler,
  type SyncTagInvalidateEventHandler,
  scheduledEventHandler,
  syncTagInvalidateEventHandler,
} from '../src/index.js'

describe('documentEventHandler', () => {
  test('passes through handler function verbatim', () => {
    const handler = (() => {
      console.log('Document changed:')
    }) satisfies DocumentEventHandler

    const result = documentEventHandler(handler)
    expect(result).toBe(handler)
  })

  test('throws error if handler is not a function', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      documentEventHandler('foo')
    }).toThrowErrorMatchingInlineSnapshot(`[TypeError: \`handler\` must be a function]`)
  })
})

describe('scheduledEventHandler', () => {
  test('passes through handler function verbatim', () => {
    const handler = (() => {
      console.log('Document changed:')
    }) satisfies ScheduledEventHandler

    const result = scheduledEventHandler(handler)
    expect(result).toBe(handler)
  })

  test('throws error if handler is not a function', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      scheduledEventHandler('foo')
    }).toThrowErrorMatchingInlineSnapshot(`[TypeError: \`handler\` must be a function]`)
  })
})

describe('syncTagEventHandler', () => {
  test('passes through handler function verbatim', () => {
    const handler = (() => {
      console.log('Sync tags invalidated:')
    }) satisfies SyncTagInvalidateEventHandler

    const result = syncTagInvalidateEventHandler(handler)
    expect(result).toBe(handler)
  })

  test('throws error if handler is not a function', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      syncTagInvalidateEventHandler('foo')
    }).toThrowErrorMatchingInlineSnapshot(`[TypeError: \`handler\` must be a function]`)
  })
})
