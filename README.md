# 3Sixty Event Bus

This repository provides a cohesive set of building blocks for event-driven systems, including shared contracts, local connectors, socket-based services, and client components. Together, these packages make it easier to publish, route, and consume events consistently across applications.

The overall goal is to give teams a reliable event bus foundation that supports modular development and clear integration boundaries, following established event-driven communication patterns such as publish-subscribe.

## Packages

- [event-bus-models](packages/event-bus-models/README.md) - Defines shared event contracts, callbacks, and connector interfaces used across the repository.
- [event-bus-connector-local](packages/event-bus-connector-local/README.md) - Provides an in-memory local connector that routes events between components without network transport.
- [event-bus-service](packages/event-bus-service/README.md) - Exposes server routes and socket entry points to publish and subscribe to event streams over WebSocket connections.
- [event-bus-socket-client](packages/event-bus-socket-client/README.md) - Provides a client component for connecting to event-bus socket endpoints and handling event subscriptions.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)

## Origin

This repository is derived from the original [iotaledger/twin-event-bus](https://github.com/iotaledger/twin-event-bus) repository.
