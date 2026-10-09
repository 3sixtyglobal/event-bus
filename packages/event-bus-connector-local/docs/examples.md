# Event Bus Connector Local Examples

Use these snippets to wire in-memory pub/sub flows for tests and lightweight runtime components.

## LocalEventBusConnector

```typescript
import { LocalEventBusConnector } from '@3sixty/event-bus-connector-local';

interface StatusPayload {
  buildId: string;
  status: 'started' | 'finished';
}

const connector = new LocalEventBusConnector();
const received: string[] = [];

console.log(connector.className()); // LocalEventBusConnector

const firstSubscription = await connector.subscribe<StatusPayload>('build.status', async event => {
  received.push(`first:${event.data.buildId}:${event.data.status}`);
});

const secondSubscription = await connector.subscribe<StatusPayload>('build.status', async event => {
  received.push(`second:${event.data.buildId}:${event.data.status}`);
});

await connector.publish<StatusPayload>('build.status', { buildId: 'B-100', status: 'started' });
await connector.unsubscribe(firstSubscription);
await connector.publish<StatusPayload>('build.status', { buildId: 'B-100', status: 'finished' });
await connector.unsubscribe(secondSubscription);

console.log(received); // ['first:B-100:started', 'second:B-100:started', 'second:B-100:finished']
```

```typescript
import { ComponentFactory } from '@3sixty/core';
import { LocalEventBusConnector } from '@3sixty/event-bus-connector-local';
import type { ILoggingComponent } from '@3sixty/logging-models';

interface AuditPayload {
  counter: number;
}

const logger: ILoggingComponent = {
  className: () => 'ConsoleLogger',
  log: async entry => {
    console.log(entry.message); // publish
  }
};

ComponentFactory.register('logging', () => logger);

const connector = new LocalEventBusConnector({
  loggingComponentType: 'logging'
});

const subscriptionId = await connector.subscribe<AuditPayload>('audit.counter', async event => {
  console.log(event.data.counter); // 3
});

await connector.publish<AuditPayload>('audit.counter', { counter: 3 });
await connector.unsubscribe(subscriptionId);
```
