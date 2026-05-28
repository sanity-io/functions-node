import {assertType, describe, expectTypeOf, test} from 'vitest'
import type {BlueprintResource, ResourcesApi} from '../src'

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

  test('per-type lookup returns BlueprintResource | undefined for every known type', () => {
    type PerTypeLookup = (name: string) => BlueprintResource | undefined

    expectTypeOf<ResourcesApi['cors']>().toEqualTypeOf<PerTypeLookup>()
    expectTypeOf<ResourcesApi['dataset']>().toEqualTypeOf<PerTypeLookup>()
    expectTypeOf<ResourcesApi['project']>().toEqualTypeOf<PerTypeLookup>()
    expectTypeOf<ResourcesApi['role']>().toEqualTypeOf<PerTypeLookup>()
    expectTypeOf<ResourcesApi['webhook']>().toEqualTypeOf<PerTypeLookup>()

    const resources = {} as ResourcesApi
    expectTypeOf(resources.cors('my-cors')).toEqualTypeOf<BlueprintResource | undefined>()
    expectTypeOf(resources.dataset('my-dataset')).toEqualTypeOf<BlueprintResource | undefined>()
    expectTypeOf(resources.project('my-proj')).toEqualTypeOf<BlueprintResource | undefined>()
    expectTypeOf(resources.role('my-role')).toEqualTypeOf<BlueprintResource | undefined>()
    expectTypeOf(resources.webhook('my-webhook')).toEqualTypeOf<BlueprintResource | undefined>()
  })

  test('unknown resource types are not part of the API', () => {
    const resources = {} as ResourcesApi
    // @ts-expect-error `function` is not a known resource type
    assertType(resources.function('my-fn'))
  })

  test('rejects non-string arguments to the callable form', () => {
    const resources = {} as ResourcesApi
    // @ts-expect-error name must be a string
    assertType(resources(123))
    // @ts-expect-error per-type name must be a string
    assertType(resources.project(123))
  })
})
