# Event Bus Socket Client Examples

These examples show how to receive server-published events over sockets with typed callbacks.

## EventBusSocketClient

```typescript
import { EventBusSocketClient } from '@3sixty/event-bus-socket-client';

interface MarketPayload {
  symbol: string;
  value: number;
  severity: 'low' | 'high';
}

const client = new EventBusSocketClient({
  config: {
    endpoint: 'http://localhost:3000'
  }
});

console.log(client.className()); // EventBusSocketClient
const received: string[] = [];

const first = await client.subscribe<MarketPayload>('market.price', async event => {
  received.push(`first:${event.data.severity}`);
  console.log(event.data.symbol); // IOTA
  console.log(event.data.value); // 0.22
});

const second = await client.subscribe<MarketPayload>('market.price', async event => {
  received.push(`second:${event.data.severity}`);
});

await client.unsubscribe(first);
await client.unsubscribe(second);

console.log(received); // []
```

```typescript
import { NotSupportedError } from '@3sixty/core';
import { EventBusSocketClient } from '@3sixty/event-bus-socket-client';

interface MessagePayload {
  body: string;
}

const client = new EventBusSocketClient({
  config: {
    endpoint: 'http://localhost:3000'
  }
});

try {
  await client.publish<MessagePayload>('chat.message', { body: 'hello' });
} catch (error) {
  if (error instanceof NotSupportedError) {
    console.log(error.name); // NotSupportedError
    console.log(error.message.includes('publish')); // true
  }
}
```
