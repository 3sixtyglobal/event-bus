// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EventBusConnectorFactory } from "../src/factories/eventBusConnectorFactory.js";
import type { IEventBusConnector } from "../src/models/IEventBusConnector.js";

describe("IEventBusConnector", () => {
	test("can add an item to the factory", async () => {
		EventBusConnectorFactory.register("my-event-bus", () => ({}) as unknown as IEventBusConnector);
	});
});
