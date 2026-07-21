import {describe, expect, test} from 'vitest'
import {createPipeline, type PipelineHandler} from '../src'

describe('createPipeline', () => {
  test('returns handler with config attached', () => {
    const config = {name: 'my-pipeline'}
    const handler: PipelineHandler = () => {}

    const result = createPipeline(config, handler)

    expect(result).toBe(handler)
    expect(result.config).toBe(config)
  })

  test('throws if config is not an object', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      createPipeline('bad', () => {})
    }).toThrow('`config` must be an object')
  })

  test('throws if config.name is not a string', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      createPipeline({name: 123}, () => {})
    }).toThrow('`config.name` must be a string')
  })

  test('throws if handler is not a function', () => {
    expect(() => {
      // @ts-expect-error Intentionally wrong type
      createPipeline({name: 'test'}, 'not-a-function')
    }).toThrow('`handler` must be a function')
  })
})
