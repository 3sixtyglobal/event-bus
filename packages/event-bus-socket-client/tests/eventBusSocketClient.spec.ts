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
			entitySchema: nameof<LogEntry>()
		});
		EntityStorageConnectorFactory.register("log-entry", () => entityStorageConnectorMemory);

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

	test("can create a server and connect to it with the socket client", async () => {
		const client = new EventBusSocketClient({ config: { endpoint: `http://localhost:${port}` } });
		const receivedTestPayloads: IEvent<{ value: number }>[] = [];

		// Subscribe to the test event
		const subscriptionId = await client.subscribe<{ value: number }>("test", async event => {
			receivedTestPayloads.push(event);
		});
		expect(subscriptionId).toHaveLength(32);

		// Wait for the subscription to be established
		await new Promise(resolve => setTimeout(resolve, 100));

		// Publish the server side event
		for (let i = 0; i < 10; i++) {
			await eventBusService.publish("test", { value: 123 });
		}

		await new Promise(resolve => setTimeout(resolve, 100));

		// Unsubscribe from the test event
		await client.unsubscribe(subscriptionId);

		// We should have received the test event in the client callback
		expect(receivedTestPayloads.length).toEqual(10);
		expect(receivedTestPayloads[0].data).toEqual({ value: 123 });
	});
});
