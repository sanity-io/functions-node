# Changelog

## [1.7.0](https://github.com/sanity-io/functions-node/compare/v1.6.9...v1.7.0) (2026-08-27)


### Features

* **durables:** add retry strategy and retry method ([#64](https://github.com/sanity-io/functions-node/issues/64)) ([001364f](https://github.com/sanity-io/functions-node/commit/001364fdc79d41439bc7553d4fe687758effa6f9))


### Bug Fixes

* **types:** seperate types by boundries ([#65](https://github.com/sanity-io/functions-node/issues/65)) ([fe9d3a7](https://github.com/sanity-io/functions-node/commit/fe9d3a78bbb4a6d981925bb6f1bf806b7a75e6d6))

## [1.6.9](https://github.com/sanity-io/functions-node/compare/v1.6.8...v1.6.9) (2026-08-25)


### Bug Fixes

* **durables:** updating delegate types and limiting handler to a function ([#62](https://github.com/sanity-io/functions-node/issues/62)) ([c05f1e1](https://github.com/sanity-io/functions-node/commit/c05f1e1db259f58a4bd8e1742c3bac76fc9aecc0))

## [1.6.8](https://github.com/sanity-io/functions-node/compare/v1.6.7...v1.6.8) (2026-08-17)


### Bug Fixes

* need to bump release-please ([#60](https://github.com/sanity-io/functions-node/issues/60)) ([947b8c3](https://github.com/sanity-io/functions-node/commit/947b8c36cdcb412167e5eef45a1613491fd3e070))

## [1.6.7](https://github.com/sanity-io/functions-node/compare/v1.6.6...v1.6.7) (2026-08-14)


### Bug Fixes

* nested invoke payload wrapping in local functions runtime ([#58](https://github.com/sanity-io/functions-node/issues/58)) ([3eb6a0c](https://github.com/sanity-io/functions-node/commit/3eb6a0cd9800b4a1ad8b9ae72a97f1427c2be916))

## [1.6.6](https://github.com/sanity-io/functions-node/compare/v1.6.5...v1.6.6) (2026-08-13)


### Bug Fixes

* align types to methods and args ([#52](https://github.com/sanity-io/functions-node/issues/52)) ([9d109a3](https://github.com/sanity-io/functions-node/commit/9d109a33042ebb9eaf86c6d7ac20a130a676cc4e))

## [1.6.5](https://github.com/sanity-io/functions-node/compare/v1.6.4...v1.6.5) (2026-08-12)


### Bug Fixes

* Ensure lineage is respected in func-to-func invokes ([#55](https://github.com/sanity-io/functions-node/issues/55)) ([42e77e3](https://github.com/sanity-io/functions-node/commit/42e77e37323374805b3dfa3a3deefca8b87a96b6))

## [1.6.4](https://github.com/sanity-io/functions-node/compare/v1.6.3...v1.6.4) (2026-08-12)


### Bug Fixes

* bundling and test tsconfigs ([#53](https://github.com/sanity-io/functions-node/issues/53)) ([ff0b40f](https://github.com/sanity-io/functions-node/commit/ff0b40f5b24708fce91b6ff8065e4afed6ffafe1))

## [1.6.3](https://github.com/sanity-io/functions-node/compare/v1.6.2...v1.6.3) (2026-08-11)


### Bug Fixes

* align logger to wrapper, align logger to how console works ([#49](https://github.com/sanity-io/functions-node/issues/49)) ([fc240e2](https://github.com/sanity-io/functions-node/commit/fc240e2bb691b7007d8809f8b1478c2acf68400b))
* Throw exception when trying to invoke non-pubsub function locally ([#50](https://github.com/sanity-io/functions-node/issues/50)) ([4d9c21c](https://github.com/sanity-io/functions-node/commit/4d9c21cbb7ef6fd4ef8eb5ee432104916049cc20))

## [1.6.2](https://github.com/sanity-io/functions-node/compare/v1.6.1...v1.6.2) (2026-08-10)


### Bug Fixes

* rename event to pubsub ([#47](https://github.com/sanity-io/functions-node/issues/47)) ([6a4b2e3](https://github.com/sanity-io/functions-node/commit/6a4b2e3a0ad177ec6fbf2fa1f1d2ab6558fd1565))
* un-hide invoke() method from docs ([#45](https://github.com/sanity-io/functions-node/issues/45)) ([948791c](https://github.com/sanity-io/functions-node/commit/948791cf301d5c7d02a5c044e88f03ff799d0ab5))

## [1.6.1](https://github.com/sanity-io/functions-node/compare/v1.6.0...v1.6.1) (2026-08-07)


### Bug Fixes

* mark as alpha / hide `invoke()` method from docs ([#43](https://github.com/sanity-io/functions-node/issues/43)) ([7733384](https://github.com/sanity-io/functions-node/commit/77333844a2236c18ce5870dd8bfe8cae1fdb27f5))

## [1.6.0](https://github.com/sanity-io/functions-node/compare/v1.5.0...v1.6.0) (2026-08-06)


### Features

* wait and waitForCondition contract ([#42](https://github.com/sanity-io/functions-node/issues/42)) ([df89dc0](https://github.com/sanity-io/functions-node/commit/df89dc0aef4dad65986f6ced73204b9b7c792335))


### Bug Fixes

* Add lineage token to invoke if not set ([#36](https://github.com/sanity-io/functions-node/issues/36)) ([58c827b](https://github.com/sanity-io/functions-node/commit/58c827bd4dc5d27af8431a046eacf5673ae3e91c))
* change from pipelines to durables ([#41](https://github.com/sanity-io/functions-node/issues/41)) ([bccc389](https://github.com/sanity-io/functions-node/commit/bccc389f4c022ff48eac750f248169e0cfec1ffd))
* Only invoke queue and pubsub functions async ([#39](https://github.com/sanity-io/functions-node/issues/39)) ([2af3be9](https://github.com/sanity-io/functions-node/commit/2af3be9d68485d6360ec5c41c1196fa97c962780))
* rename event to pubsub ([#40](https://github.com/sanity-io/functions-node/issues/40)) ([ca11e26](https://github.com/sanity-io/functions-node/commit/ca11e26a7ff1ec5512efb450fe624b6a676b67c6))
* Sync function-to-function invoke only supports sanity.function.event ([#38](https://github.com/sanity-io/functions-node/issues/38)) ([4d27236](https://github.com/sanity-io/functions-node/commit/4d272364f92070aef1f2390bfe1aae1f09f368aa))

## [1.5.0](https://github.com/sanity-io/functions-node/compare/v1.4.0...v1.5.0) (2026-07-27)


### Features

* initial pipeline function shaping ([#32](https://github.com/sanity-io/functions-node/issues/32)) ([405a6b3](https://github.com/sanity-io/functions-node/commit/405a6b3e8e1e3e1e1fc25be3cf8e499a3a3bd57b))


### Bug Fixes

* Add sync invoke to the @sanity/functions invoke method ([#34](https://github.com/sanity-io/functions-node/issues/34)) ([1f9186f](https://github.com/sanity-io/functions-node/commit/1f9186f19b301ed09fa87a475b95cd546fee3c70))

## [1.4.0](https://github.com/sanity-io/functions-node/compare/v1.3.1...v1.4.0) (2026-06-29)


### Features

* Add `context.resources` to types ([#26](https://github.com/sanity-io/functions-node/issues/26)) ([42fb063](https://github.com/sanity-io/functions-node/commit/42fb0639e5cd1221b53431937379ec6193370954))
* add invoke method ([#28](https://github.com/sanity-io/functions-node/issues/28)) ([9c1bbcb](https://github.com/sanity-io/functions-node/commit/9c1bbcb44298c2ecf70de81d3c235399ee492662))
* add local invoke path ([#29](https://github.com/sanity-io/functions-node/issues/29)) ([90de226](https://github.com/sanity-io/functions-node/commit/90de2263e440c22a26ec75aa823ef4aa5fb4742b))


### Bug Fixes

* generic event handler ([#30](https://github.com/sanity-io/functions-node/issues/30)) ([4712faf](https://github.com/sanity-io/functions-node/commit/4712fafc6c1381e2b8f169cb7eea417803c16254))
* Moar generic EventHandler ([#31](https://github.com/sanity-io/functions-node/issues/31)) ([a6bc472](https://github.com/sanity-io/functions-node/commit/a6bc47224c8bdc3766ca1562d84dbcd062ca6c28))

## [1.3.1](https://github.com/sanity-io/functions-node/compare/v1.3.0...v1.3.1) (2026-04-13)


### Bug Fixes

* **ci:** change package name for TypeDoc upload action ([#24](https://github.com/sanity-io/functions-node/issues/24)) ([2d55dd9](https://github.com/sanity-io/functions-node/commit/2d55dd94694ea1a2d72456798a9264e5a7589b39))

## [1.3.0](https://github.com/sanity-io/functions-node/compare/v1.2.1...v1.3.0) (2026-04-07)


### Features

* add syncTagInvalidateEventHandler ([#18](https://github.com/sanity-io/functions-node/issues/18)) ([840a552](https://github.com/sanity-io/functions-node/commit/840a552c14003d6def24324b05d17073835ca65e))

## [1.2.1](https://github.com/sanity-io/functions-node/compare/v1.2.0...v1.2.1) (2026-03-05)


### Bug Fixes

* rename scheduleEventHandler to scheduledEventHandler ([#16](https://github.com/sanity-io/functions-node/issues/16)) ([c4fbb32](https://github.com/sanity-io/functions-node/commit/c4fbb3210c3be47d1dabbbe5ff03ad190cf6b9bb))

## [1.2.0](https://github.com/sanity-io/functions-node/compare/v1.1.0...v1.2.0) (2026-01-26)


### Features

* add definer for scheduled functions ([#12](https://github.com/sanity-io/functions-node/issues/12)) ([8af1f6d](https://github.com/sanity-io/functions-node/commit/8af1f6dd2d9c3f00908e6dd6104b581d2ca5412c))

## [1.1.0](https://github.com/sanity-io/functions-node/compare/v1.0.3...v1.1.0) (2025-11-03)


### Features

* adding new event and function resource type and IDs to `FunctionContext` ([#9](https://github.com/sanity-io/functions-node/issues/9)) ([6225bec](https://github.com/sanity-io/functions-node/commit/6225bec5463e29e9aa036e696a383b48794fdc5e))

## [1.0.3](https://github.com/sanity-io/functions-node/compare/v1.0.2...v1.0.3) (2025-06-23)


### Bug Fixes

* RUN-562 Add local boolean to function context ([#7](https://github.com/sanity-io/functions-node/issues/7)) ([5b7e456](https://github.com/sanity-io/functions-node/commit/5b7e456d61fb4c981beed3d85b74f8b2d5e91ab5))

## [1.0.2](https://github.com/sanity-io/functions-node/compare/v1.0.1...v1.0.2) (2025-05-06)


### Bug Fixes

* use public publish config ([4881995](https://github.com/sanity-io/functions-node/commit/48819951c2ac8ecec76e33f5733576f50837d50a))

## [1.0.1](https://github.com/sanity-io/functions-node/compare/v1.0.0...v1.0.1) (2025-05-06)


### Bug Fixes

* add prepublish step ([29ceaf5](https://github.com/sanity-io/functions-node/commit/29ceaf5fca7fffbcc434778d72312ef835694146))
* add supported engines to `package.json` ([386e7b0](https://github.com/sanity-io/functions-node/commit/386e7b0b64a562aaf6986d450420fa66a679c5b0))
* document release process ([8a9842c](https://github.com/sanity-io/functions-node/commit/8a9842cf6daa4cc83c89ac8c99cb8cba64c7c67f))

## 1.0.0 (2025-05-06)


### Features

* initial version ([1f19541](https://github.com/sanity-io/functions-node/commit/1f19541cc27ac5083c904a2fcbf21ea972cd0309))
