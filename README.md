# @sanity/functions

Helper methods and type definitions for Sanity Functions.

## Installation

```bash
npm install @sanity/functions
```

## Usage

### Basic

```ts
import {documentEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'

export const handler = documentEventHandler(async ({context, event}) => {
  // Create a Sanity client using the context options
  const client = createClient({
    apiVersion: '2025-05-01',
    ...context.clientOptions,
  })

  // Access the event data
  const data = event.doc

  // Your function implementation
  console.log('Document updated:', data)
})
```

### Typescript: Passing type for data

By default, the `event.doc` property is untyped (`any`). If you know what the shape of the data that will be delivered is, you can specify it as a generic to the function:

```ts
interface NotificationData {
  documentId: string
  text: string
}

export const handler = documentEventHandler<NotificationData>(async ({event}) => {
  console.log(event.doc.text) // Typed as `string`
  console.log(event.doc.notSet) // Will yield type error
})
```

### Type only (TypeScript)

```ts
import {type DocumentEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'

export const handler: DocumentEventHandler = async ({context, event}) => {
  // …
}

// …you can also define the data type:
export const handler: DocumentEventHandler<{text: string}> = async ({event}) => {
  console.log(event.doc.text)
}
```

### Type only (JavaScript)

```js
/** @type {import('@sanity/functions').DocumentEventHandler} */
export const handler = async ({context, event}) => {
  console.log(event.doc.text)
}

// …you can also define the data type:
/** @type {import('@sanity/functions').DocumentEventHandler<{text: string}>} */
export const handler = async ({event}) => {
  console.log(event.doc.text)
}
```

## Development

To build this project:

```bash
npm run build
```

To run tests:

```bash
npm test
```

To run type checking:

```bash
npm run lint
```

## License

MIT © [Sanity.io](https://sanity.io)
