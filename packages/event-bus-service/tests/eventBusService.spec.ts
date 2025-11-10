// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SocketRouteProcessor } from "@twin.org/api-processors";
import { FastifyWebServer } from "@twin.org/api-server-fastify";
import { ComponentFactory } from "@twin.org/core";
import { LocalEventBusConnector } from "@twin.org/event-bus-connector-local";
import { EventBusConnectorFactory } from "@twin.org/event-bus-models";
import { generateSocketRoutesEventBus } from "../src/eventBusRoutes.js";
import { EventBusService } from "../src/eventBusService.js";

describe("EventBusService", () => {
	test("can construct with dependencies", async () => {
		const localEventBusService = new LocalEventBusConnector();
		EventBusConnectorFactory.register("event-bus", () => localEventBusService);
		const eventBusService = new EventBusService({ eventBusConnectorType: "event-bus" });
		expect(eventBusService).toBeDefined();
	});

	test("can serve the routes", async () => {
		const server = new FastifyWebServer();

		const localEventBusService = new LocalEventBusConnector();
		EventBusConnectorFactory.register("event-bus", () => localEventBusService);
		const eventBusService = new EventBusService({ eventBusConnectorType: "event-bus" });

		ComponentFactory.register("eventBus", () => eventBusService);

		const socketRoutes = generateSocketRoutesEventBus("event-bus", "eventBus");

		await server.build(undefined, undefined, [new SocketRouteProcessor()], socketRoutes);

		await server.start();
		await server.stop();
	});
});
