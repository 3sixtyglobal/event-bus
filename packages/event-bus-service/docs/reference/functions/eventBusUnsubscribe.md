# Function: eventBusUnsubscribe()

> **eventBusUnsubscribe**(`socketRequestContext`, `componentName`, `request`, `emitter`): `Promise`\<`void`\>

Unsubscribe from a topic.

## Parameters

### socketRequestContext

`ISocketRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IEventBusUnsubscribeRequest`

The request.

### emitter

(`topic`, `response`) => `Promise`\<`void`\>

The emitter to send message back.

## Returns

`Promise`\<`void`\>

A promise that resolves when the unsubscribe has been processed.
