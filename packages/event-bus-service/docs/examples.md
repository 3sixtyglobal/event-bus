# Event Bus Service Examples

Use these patterns to expose pub/sub behaviour through application components and socket routes.

## EventBusService

```typescript
import { LocalEventBusConnector } from '@3sixty/event-bus-connector-local';
import { EventBusConnectorFactory } from '@3sixty/event-bus-models';
import { EventBusService } from '@3sixty/event-bus-service';

interface BuildMetricPayload {
  buildId: string;
  status: 'started' | 'finished';
  metric: number;
}

EventBusConnectorFactory.register('event-bus', () => new LocalEventBusConnector());

const service = new EventBusService({ eventBusConnectorType: 'event-bus' });
const metrics: number[] = [];

console.log(service.className()); // EventBusService

const subscriptionId = await service.subscribe<BuildMetricPayload>('build.status', async event => {
  console.log(event.data.buildId); // B-100
  console.log(event.data.status); // started
  metrics.push(event.data.metric);
});

await service.publish<BuildMetricPayload>('build.status', {
  buildId: 'B-100',
  status: 'started',
  metric: 62
});
await service.publish<BuildMetricPayload>('build.status', {
  buildId: 'B-100',
  status: 'finished',
  metric: 71
});
await service.unsubscribe(subscriptionId);

console.log(metrics); // [62, 71]
```

## Socket Routes

```typescript
import { ComponentFactory } from '@3sixty/core';
import { LocalEventBusConnector } from '@3sixty/event-bus-connector-local';
import { EventBusConnectorFactory } from '@3sixty/event-bus-models';
import {
  EventBusService,
  generateSocketRoutesEventBus,
  socketEntryPoints,
  tagsEventBus
} from '@3sixty/event-bus-service';

EventBusConnectorFactory.register('event-bus', () => new LocalEventBusConnector());

const service = new EventBusService({ eventBusConnectorType: 'event-bus' });
ComponentFactory.register('eventBus', () => service);

const routes = generateSocketRoutesEventBus('event-bus', 'eventBus');

console.log(routes.length); // 2
console.log(routes[0].operationId); // eventBusSubscribe
console.log(routes[1].operationId); // eventBusUnsubscribe
console.log(tagsEventBus[0].name); // Event Bus
console.log(socketEntryPoints[0].defaultBaseRoute); // event-bus
```
