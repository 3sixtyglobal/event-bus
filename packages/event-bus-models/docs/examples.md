# Event Bus Models Examples

These snippets show how to define strongly typed contracts and register connector implementations.

## EventBusConnectorFactory

```typescript
import {
  EventBusConnectorFactory,
  type EventBusCallback,
  type IEventBusConnector
} from '@twin.org/event-bus-models';

class TestConnector implements IEventBusConnector {
  private readonly subscriptions: Map<string, EventBusCallback<unknown>> = new Map();

  public className(): string {
    return 'TestConnector';
  }

  public async subscribe<T>(topic: string, callback: EventBusCallback<T>): Promise<string> {
    this.subscriptions.set(topic, callback as EventBusCallback<unknown>);
    return `${topic}-1`;
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    const topic = subscriptionId.slice(0, subscriptionId.lastIndexOf('-'));
    this.subscriptions.delete(topic);
  }

  public async publish<T>(topic: string, data: T): Promise<void> {
    const callback = this.subscriptions.get(topic) as EventBusCallback<T> | undefined;
    if (callback) {
      await callback({
        id: 'evt-001',
        ts: Date.now(),
        topic,
        data
      });
    }
  }
}

EventBusConnectorFactory.register('test', () => new TestConnector());

const connector = EventBusConnectorFactory.get('test');
console.log(connector.className()); // TestConnector
```

```typescript
import {
  EventBusConnectorFactory,
  type IEvent,
  type IEventBusConnector,
  type IEventBusSubscribeRequest,
  type IEventBusSubscribeResponse,
  type IEventBusUnsubscribeRequest
} from '@twin.org/event-bus-models';

interface OrderCreatedData {
  orderId: string;
  amount: number;
}

const subscribeRequest: IEventBusSubscribeRequest = {
  body: {
    topic: 'order.created'
  }
};

const subscribeResponse: IEventBusSubscribeResponse = {
  body: {
    topic: subscribeRequest.body.topic,
    subscriptionId: 'order.created-1'
  }
};

const unsubscribeRequest: IEventBusUnsubscribeRequest = {
  body: {
    subscriptionId: subscribeResponse.body.subscriptionId
  }
};

const event: IEvent<OrderCreatedData> = {
  id: 'evt-order-001',
  ts: Date.now(),
  topic: subscribeRequest.body.topic,
  data: {
    orderId: 'ORD-42',
    amount: 199
  }
};

const connector: IEventBusConnector = EventBusConnectorFactory.get('test');

console.log(unsubscribeRequest.body.subscriptionId); // order.created-1
console.log(event.data.orderId); // ORD-42
console.log(connector.className()); // TestConnector
```
