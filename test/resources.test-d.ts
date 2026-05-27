import { assertType, describe, expectTypeOf, test } from 'vitest'
import type { BlueprintResource, ResourcesApi } from '../src'

describe('ResourcesApi', () => {
  test('is callable for cross-type lookup by name', () => {
    expectTypeOf<ResourcesApi>().toBeCallableWith('my-proj')
    expectTypeOf<ResourcesApi>().returns.toEqualTypeOf<BlueprintResource | undefined>()
  })

  test('.all() returns a flat array of resources', () => {
    expectTypeOf<ResourcesApi['all']>().toBeFunction()
    expectTypeOf<ResourcesApi['all']>().returns.toEqualTypeOf<BlueprintResource[]>()
  })

  test('is iterable as Iterable<BlueprintResource>', () => {
    expectTypeOf<ResourcesApi>().toExtend<Iterable<BlueprintResource>>()

    const resources = {} as ResourcesApi
    const spread = [...resources]
    expectTypeOf(spread).toEqualTypeOf<BlueprintResource[]>()

    for (const resource of resources) {
      expectTypeOf(resource).toEqualTypeOf<BlueprintResource>()
    }
  })

  test('per-type lookup returns BlueprintResource | undefined', () => {
    expectTypeOf<ResourcesApi['project']>().toEqualTypeOf<(name: string) => BlueprintResource | undefined>()
    expectTypeOf<ResourcesApi['dataset']>().toEqualTypeOf<(name: string) => BlueprintResource | undefined>()

    const resources = {} as ResourcesApi
    expectTypeOf(resources.project('my-proj')).toEqualTypeOf<BlueprintResource | undefined>()
    expectTypeOf(resources.dataset('my-dataset')).toEqualTypeOf<BlueprintResource | undefined>()
  })

  test('rejects non-string arguments to the callable form', () => {
    const resources = {} as ResourcesApi
    // @ts-expect-error name must be a string
    assertType(resources(123))
    // @ts-expect-error per-type name must be a string
    assertType(resources.project(123))
  })
})
