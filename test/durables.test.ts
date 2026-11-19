import {describe, expect, test} from 'vitest'
import {type DurableHandler, durableEventHandler, normalizeDelay, parseDuration, UnrecoverableError} from '../src/index.js'

describe('parseDuration', () => {
  test('parses a 365-day year in seconds', () => {
    expect(parseDuration('1 year')).toBe(31_536_000)
  })
})

describe('normalizeDelay', () => {
  test('converts a delay string to an AWS duration', () => {
    expect(normalizeDelay('2 days 3 hours')).toStrictEqual({days: 2, hours: 3})
  })

  test('accepts singular units, abbreviations, and comma-separated values', () => {
    expect(normalizeDelay('1 minute')).toStrictEqual({minutes: 1})
    expect(normalizeDelay('1 min')).toStrictEqual({minutes: 1})
    expect(normalizeDelay('1 day, 2 hours')).toStrictEqual({days: 1, hours: 2})
    expect(normalizeDelay('1 hr, 30 secs')).toStrictEqual({hours: 1, seconds: 30})
  })

  test('rejects units outside days, hours, minutes, and seconds', () => {
    expect(() => normalizeDelay('1 week')).toThrow(TypeError)
  })
})

describe('UnrecoverableError', () => {
  test('is an Error', () => {
    const error = new UnrecoverableError('cannot retry')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('UnrecoverableError')
    expect(error.message).toBe('cannot retry')
  })
})

describe('durableEventHandler', () => {
  test('returns handler with config attached', () => {
    const config = {name: 'my-durable'}
    const handler: DurableHandler = () => {}

    const result = durableEventHandler(config, handler)

    expect(result).toBe(handler)
    expect(result.config).toBe(config)
  })

  test('returns handler with no config', () => {
    const handler: DurableHandler = () => {}

    const result = durableEventHandler(handler)

    expect(result).toBe(handler)
    expect(result.config).toBeUndefined()
  })

  test('throws if config is `undefined`', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      durableEventHandler(undefined, () => {})
    }).toThrowErrorMatchingInlineSnapshot(`[TypeError: \`config\` must be defined]`)
  })

  test('throws if config is not an object', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      durableEventHandler('bad', () => {})
    }).toThrow('`config` must be an object')
  })

  test('throws if config.name is not a string', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      durableEventHandler({name: 123}, () => {})
    }).toThrow('`config.name` must be a string')
  })

  test('throws if config.event is not an object', () => {
    expect(() => {
      durableEventHandler({name: 'test', event: 'not-an-object'}, () => {})
    }).toThrow('`event` must be an object')
  })

  test('throws if config.event.type is not one of the allowed types', () => {
    expect(() => {
      durableEventHandler({name: 'test', event: {type: 'media'}}, () => {})
    }).toThrow('`event.type` must be one of: document, media-library, sync-tag-invalidate')
  })

  test('throws if handler is not a function', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      durableEventHandler({name: 'test'}, 'not-a-function')
    }).toThrow('`handler` must be a function')
  })

  test('throws if `durableTimeout` is less than 60 seconds', () => {
    expect(() => {
      durableEventHandler({name: 'test', durableTimeout: 59}, () => {})
    }).toThrow('`config.durableTimeout` must be at least 60 seconds')
  })
  test('accepts a string durableTimeout', () => {
    expect(() => {
      durableEventHandler({name: 'test', durableTimeout: '1 hour'}, () => {})
    }).not.toThrow()
  })

  test('throws if `durableTimeout` is more than 31_536_000 seconds (1 year)', () => {
    expect(() => {
      durableEventHandler({name: 'test', durableTimeout: 31_536_001}, () => {})
    }).toThrow('`config.durableTimeout` must be at most 1 year')
  })
})
