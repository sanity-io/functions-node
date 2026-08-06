import {describe, expect, test} from 'vitest'
import {createDurable, type DurableHandler} from '../src'

describe('createDurable', () => {
  test('returns handler with config attached', () => {
    const config = {name: 'my-durable'}
    const handler: DurableHandler = () => {}

    const result = createDurable(config, handler)

    expect(result).toBe(handler)
    expect(result.config).toBe(config)
  })

  test('returns handler with no config', () => {
    const handler: DurableHandler = () => {}

    const result = createDurable(handler)

    expect(result).toBe(handler)
    expect(result.config).toBeUndefined()
  })

  test('throws if config is `undefined`', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      createDurable(undefined, () => {})
    }).toThrowErrorMatchingInlineSnapshot(`[TypeError: \`config\` must be defined]`)
  })

  test('throws if config is not an object', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      createDurable('bad', () => {})
    }).toThrow('`config` must be an object')
  })

  test('throws if config.name is not a string', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      createDurable({name: 123}, () => {})
    }).toThrow('`config.name` must be a string')
  })

  test('throws if config.event is not an object', () => {
    expect(() => {
      createDurable({name: 'test', event: 'not-an-object'}, () => {})
    }).toThrow('`event` must be an object')
  })

  test('throws if config.event.type is not one of the allowed types', () => {
    expect(() => {
      createDurable({name: 'test', event: {type: 'media'}}, () => {})
    }).toThrow('`event.type` must be one of: document, media-library, cron, sync-tag-invalidate')
  })

  test('throws if handler is not a function', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      createDurable({name: 'test'}, 'not-a-function')
    }).toThrow('`handler` must be a function')
  })
})
