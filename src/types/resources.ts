/**
 * An interface to describe resources found in a Blueprint
 */
export interface BlueprintResource<TType extends string = string> {
  id: string
  name: string
  type: TType
}

export interface ResourcesApi {
  /** Cross-type lookup by name: `context.resources('my-proj')`. */
  (name: string): BlueprintResource | undefined
  /** Flat array of every resource across types. */
  all(): BlueprintResource[]
  /** Iterate every resource: `for (const r of context.resources)`. */
  [Symbol.iterator](): IterableIterator<BlueprintResource>
  /** Type specific lookup by name: `context.cors('my-cors')` */
  cors(name: string): BlueprintResource | undefined
  dataset(name: string): BlueprintResource | undefined
  function(name: string): BlueprintResource<`sanity.function.${string}`> | undefined
  project(name: string): BlueprintResource | undefined
  role(name: string): BlueprintResource | undefined
  webhook(name: string): BlueprintResource | undefined
}
