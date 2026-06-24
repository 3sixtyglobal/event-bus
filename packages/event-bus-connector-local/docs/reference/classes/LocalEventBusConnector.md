# Class: LocalEventBusConnector

Class for performing event bus operations locally.

## Implements

- `IEventBusConnector`

## Constructors

### Constructor

> **new LocalEventBusConnector**(`options?`): `LocalEventBusConnector`

Create a new instance of LocalEventBusConnector.

#### Parameters

##### options?

[`ILocalEventBusConnectorConstructorOptions`](../interfaces/ILocalEventBusConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`LocalEventBusConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"local"`

The namespace supported by the event bus connector.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IEventBusConnector.className`

***

### subscribe() {#subscribe}

> **subscribe**\<`T`\>(`topic`, `callback`): `Promise`\<`string`\>

Subscribe to the event bus.

#### Type Parameters

##### T

`T`

#### Parameters

##### topic

`string`

The topic being subscribed to.

##### callback

`EventBusCallback`\<`T`\>

The callback to be called when the event occurs on the bus.

#### Returns

`Promise`\<`string`\>

The id of the subscription, to be used in unsubscribe.

#### Implementation of

`IEventBusConnector.subscribe`

***

### unsubscribe() {#unsubscribe}

> **unsubscribe**(`subscriptionId`): `Promise`\<`void`\>

Unsubscribe from the event bus.

#### Parameters

##### subscriptionId

`string`

The subscription to unsubscribe.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the subscription has been removed.

#### Implementation of

`IEventBusConnector.unsubscribe`

***

### publish() {#publish}

> **publish**\<`T`\>(`topic`, `data`): `Promise`\<`void`\>

Publish an event to the bus.

#### Type Parameters

##### T

`T`

#### Parameters

##### topic

`string`

The topic to publish.

##### data

`T`

The data to publish.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the event has been dispatched to all subscribers.

#### Implementation of

`IEventBusConnector.publish`
