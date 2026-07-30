// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SocketRouteProcessor } from "@twin.org/api-processors";
import { FastifyWebServer } from "@twin.org/api-server-fastify";
import { ComponentFactory } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { LocalEventBusConnector } from "@twin.org/event-bus-connector-local";
import {
	EventBusConnectorFactory,
	type IEventBusComponent,
	type IEvent
} from "@twin.org/event-bus-models";
import { EventBusService, generateSocketRoutesEventBus } from "@twin.org/event-bus-service";
import {
	EntityStorageLoggingConnector,
	initSchema,
	type LogEntry
} from "@twin.org/logging-connector-entity-storage";
import { LoggingConnectorFactory } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import type { Socket } from "socket.io-client";
import { EventBusSocketClient } from "../src/eventBusSocketClient.js";

const basePort = Math.floor(Math.random() * 1000);
let port = 3000 + basePort;

let server: FastifyWebServer;
let eventBusService: IEventBusComponent;

describe("EventBusSocketClient", () => {
	beforeEach(async () => {
		port++;
		initSchema();
		const entityStorageConnectorMemory = new MemoryEntityStorageConnector({
			entitySchema: nameof<LogEntry>(),
			config: { storageKey: "log-entry" }
		});
		EntityStorageConnectorFactory.register("log-entry", () => entityStorageConnectorMemory);
		ComponentFactory.register("platform", () => ({
			className: () => "platform",
			isMultiTenant: () => false,
			execute: async (method: () => Promise<void>) => method(),
			getLocalOriginContext: async () => undefined
		}));

		const loggingConnectorEntityStorage = new EntityStorageLoggingConnector({
			logEntryStorageConnectorType: "log-entry"
		});
		LoggingConnectorFactory.register("logging", () => loggingConnectorEntityStorage);

		server = new FastifyWebServer();

		const localEventBusService = new LocalEventBusConnector();
		EventBusConnectorFactory.register("event-bus", () => localEventBusService);
		eventBusService = new EventBusService({ eventBusConnectorType: "event-bus" });

		ComponentFactory.register("eventBus", () => eventBusService);

		const socketRoutes = generateSocketRoutesEventBus("event-bus", "eventBus");

		await server.build(undefined, undefined, [new SocketRouteProcessor()], socketRoutes, { port });

		await server.start();
	});

	afterEach(async () => {
		await server.stop();
	});

	test("can create a server and connect to it with the socket client", { retry: 3 }, async () => {
		const client = new EventBusSocketClient({ config: { endpoint: `http://localhost:${port}` } });
		const receivedTestPayloads: IEvent<{ value: number }>[] = [];

		// Subscribe to the test event
		const subscriptionId = await client.subscribe<{ value: number }>("test", async event => {
			receivedTestPayloads.push(event);
		});
		expect(subscriptionId).toHaveLength(32);

		for (let attempt = 0; attempt < 10; attempt++) {
			for (let i = 0; i < 10; i++) {
				await eventBusService.publish("test", { value: 123 });
			}

			if (receivedTestPayloads.length >= 10) {
				break;
			}

			await new Promise(resolve => setTimeout(resolve, 50));
		}

		await new Promise(resolve => setTimeout(resolve, 100));

		// Unsubscribe from the test event
		await client.unsubscribe(subscriptionId);

		// We should have received the test event in the client callback
		expect(receivedTestPayloads.length).toBeGreaterThanOrEqual(10);
		expect(receivedTestPayloads[0].data).toEqual({ value: 123 });
	});

	test(
		"subscribing to multiple topics before socket connects delivers events for each topic",
		{ retry: 3 },
		async () => {
			const client = new EventBusSocketClient({ config: { endpoint: `http://localhost:${port}` } });
			const receivedA: IEvent<{ value: number }>[] = [];
			const receivedB: IEvent<{ value: number }>[] = [];
			const receivedC: IEvent<{ value: number }>[] = [];

			// Subscribe to three topics in rapid succession before the socket is connected.
			// Each call used to register a new "connect" listener, causing handleConnected()
			// to replay all topics N times — producing N server-side subscriptions per topic.
			const [subA, subB, subC] = await Promise.all([
				client.subscribe<{ value: number }>("multi-topic-a", async e => {
					receivedA.push(e);
				}),
				client.subscribe<{ value: number }>("multi-topic-b", async e => {
					receivedB.push(e);
				}),
				client.subscribe<{ value: number }>("multi-topic-c", async e => {
					receivedC.push(e);
				})
			]);

			for (let attempt = 0; attempt < 10; attempt++) {
				await eventBusService.publish("multi-topic-a", { value: 1 });
				await eventBusService.publish("multi-topic-b", { value: 2 });
				await eventBusService.publish("multi-topic-c", { value: 3 });

				if (receivedA.length >= 1 && receivedB.length >= 1 && receivedC.length >= 1) {
					break;
				}

				await new Promise(resolve => setTimeout(resolve, 50));
			}

			// Let the event loop settle so delayed deliveries are included.
			await new Promise(resolve => setTimeout(resolve, 100));

			// Each topic should deliver at least one event.
			expect(receivedA.length).toBeGreaterThanOrEqual(1);
			expect(receivedB.length).toBeGreaterThanOrEqual(1);
			expect(receivedC.length).toBeGreaterThanOrEqual(1);

			await Promise.all([
				client.unsubscribe(subA),
				client.unsubscribe(subB),
				client.unsubscribe(subC)
			]);
		}
	);

	test("server releases subscription when socket disconnects abruptly", async () => {
		const client = new EventBusSocketClient({ config: { endpoint: `http://localhost:${port}` } });
		const received: IEvent<{ value: number }>[] = [];

		await client.subscribe<{ value: number }>("test-abrupt-disconnect", async event => {
			received.push(event);
		});

		// Wait for subscription to establish
		await new Promise(resolve => setTimeout(resolve, 200));

		// Forcefully close the underlying socket without going through the unsubscribe flow,
		// simulating a dropped connection (browser tab close, network cut, etc.)
		(client as unknown as { _socket: Socket })._socket.disconnect();

		// Wait for the server's disconnected handler to run and clean up the subscription
		await new Promise(resolve => setTimeout(resolve, 200));

		// Publish — the subscription should have been released so no events are delivered
		await eventBusService.publish("test-abrupt-disconnect", { value: 99 });

		await new Promise(resolve => setTimeout(resolve, 100));

		expect(received).toHaveLength(0);
	});

	test("server subscription is cleaned up after explicit client unsubscribe", async () => {
		const connector = (eventBusService as unknown as { _eventBus: LocalEventBusConnector })
			._eventBus;
		const client = new EventBusSocketClient({ config: { endpoint: `http://localhost:${port}` } });

		const subscriptionId = await client.subscribe<{ value: number }>(
			"test-clean-unsubscribe",
			async () => {}
		);

		// Wait for subscription to establish on the server
		await new Promise(resolve => setTimeout(resolve, 200));

		expect(
			Object.keys(
				(connector as unknown as { _subscriptions: { [key: string]: unknown } })._subscriptions[
					"test-clean-unsubscribe"
				] ?? {}
			)
		).toHaveLength(1);

		await client.unsubscribe(subscriptionId);

		// Wait for the unsubscribe to be processed by the server
		await new Promise(resolve => setTimeout(resolve, 200));

		expect(
			(connector as unknown as { _subscriptions: { [key: string]: unknown } })._subscriptions[
				"test-clean-unsubscribe"
			]
		).toBeUndefined();
	});
});
