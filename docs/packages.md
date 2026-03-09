# Event Bus Packages

## event-bus-models

This package defines the shared contracts, callback types, and connector interfaces that establish a consistent event model across the repository. It helps ensure interoperability between components and supports event formats aligned with widely used event specification approaches such as [CloudEvents](https://cloudevents.io/).

- [README](../packages/event-bus-models/README.md)
- [Examples](../packages/event-bus-models/docs/examples.md)
- [Changelog](../packages/event-bus-models/docs/changelog.md)

## event-bus-connector-local

This package provides a local connector implementation for event routing within the same runtime boundary. It is designed to support dependable in-process communication between components, enabling low-latency integration without external transport dependencies.

- [README](../packages/event-bus-connector-local/README.md)
- [Examples](../packages/event-bus-connector-local/docs/examples.md)
- [Changelog](../packages/event-bus-connector-local/docs/changelog.md)

## event-bus-service

This package delivers the socket-based service layer that exposes event bus entry points for publishing and subscription workflows. It provides the server-side foundation for real-time event distribution over [WebSocket](https://developer.mozilla.org/docs/Web/API/WebSocket).

- [README](../packages/event-bus-service/README.md)
- [Examples](../packages/event-bus-service/docs/examples.md)
- [Changelog](../packages/event-bus-service/docs/changelog.md)

## event-bus-socket-client

This package provides a client integration for connecting applications to socket-based event bus endpoints. It supports remote event subscription and publishing flows using the [WebSocket](https://developer.mozilla.org/docs/Web/API/WebSocket) protocol.

- [README](../packages/event-bus-socket-client/README.md)
- [Examples](../packages/event-bus-socket-client/docs/examples.md)
- [Changelog](../packages/event-bus-socket-client/docs/changelog.md)
