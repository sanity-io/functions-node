import {describe, expect, test} from 'vitest'
import {documentEventHandler, type DocumentEventHandler} from '../src/index.js'

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
