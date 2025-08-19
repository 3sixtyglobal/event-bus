// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ComponentFactory, GeneralError, I18n, RandomHelper } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EntityStorageLoggingConnector,
	type LogEntry,
	initSchema
} from "@twin.org/logging-connector-entity-storage";
import { LoggingConnectorFactory } from "@twin.org/logging-models";
import { LoggingService } from "@twin.org/logging-service";
import { nameof } from "@twin.org/nameof";
import { LocalEventBusConnector } from "../src/localEventBusConnector";

/**
 * Test payload for testing.
 */
interface TestPayload {
	/**
	 * The counter.
	 */
	counter: number;
}

const FIRST_TIMESTAMP = 1724327000000;

let memoryEntityStorage: MemoryEntityStorageConnector<LogEntry>;

describe("LocalEventBusConnector", () => {
	beforeAll(async () => {
		I18n.addDictionary("en", await import("../locales/en.json"));

		initSchema();
	});

	beforeEach(() => {
		memoryEntityStorage = new MemoryEntityStorageConnector<LogEntry>({
			entitySchema: nameof<LogEntry>()
		});
		EntityStorageConnectorFactory.register("log-entry", () => memoryEntityStorage);
		LoggingConnectorFactory.register("logging", () => new EntityStorageLoggingConnector());
		ComponentFactory.register("logging", () => new LoggingService());

		let timeCounter: number = 0;
		const mockNow = vi.fn();
		mockNow.mockImplementation(() => FIRST_TIMESTAMP + timeCounter++);
		Date.now = mockNow;

		const mockRandom = vi.fn();

		for (let k = 0; k < 50; k++) {
			mockRandom.mockImplementationOnce(length => new Uint8Array(length).fill(k));
		}

		RandomHelper.generate = mockRandom;
	});

	test("can construct with dependencies", async () => {
		const localEventBusConnector = new LocalEventBusConnector();
		expect(localEventBusConnector).toBeDefined();
	});

	test("can subscribe to a topic and get a subscription id", async () => {
		const localEventBusConnector = new LocalEventBusConnector();

		let counter = 0;
		let receivedTopic = "";
		const subscriptionId = await localEventBusConnector.subscribe<TestPayload>(
			"test",
			async event => {
				receivedTopic = event.topic;
				counter = event.data.counter;
			}
		);
		await localEventBusConnector.publish<TestPayload>("test", { counter: 5 });

		expect(subscriptionId.length).toEqual(32);
		expect(counter).toEqual(5);
		expect(receivedTopic).toEqual("test");

		const logs = memoryEntityStorage.getStore();
		expect(logs).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000000,
				message: "subscribe",
				data: {
					topic: "test",
					subscriptionId: "00000000000000000000000000000000"
				}
			},
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000002,
				message: "publish",
				data: {
					topic: "test",
					eventId: "02020202020202020202020202020202",
					subscriptionCount: 1
				}
			}
		]);
		expect(I18n.hasMessage("info.localEventBusConnector.subscribe")).toEqual(true);
		expect(I18n.hasMessage("info.localEventBusConnector.publish")).toEqual(true);
	});

	test("can unsubscribe from a topic", async () => {
		const localEventBusConnector = new LocalEventBusConnector();

		let counter = 0;
		let receivedTopic = "";
		const subscriptionId = await localEventBusConnector.subscribe<TestPayload>(
			"test",
			async event => {
				receivedTopic = event.topic;
				counter = event.data.counter;
			}
		);
		await localEventBusConnector.unsubscribe(subscriptionId);
		await localEventBusConnector.publish<TestPayload>("test", { counter: 5 });

		expect(subscriptionId.length).toEqual(32);
		expect(counter).toEqual(0);
		expect(receivedTopic).toEqual("");

		const logs = memoryEntityStorage.getStore();
		expect(logs).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000000,
				message: "subscribe",
				data: {
					topic: "test",
					subscriptionId: "00000000000000000000000000000000"
				}
			},
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000001,
				message: "unsubscribe",
				data: {
					topic: "test",
					subscriptionId: "00000000000000000000000000000000"
				}
			},
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000003,
				message: "publish",
				data: {
					topic: "test",
					eventId: "03030303030303030303030303030303",
					subscriptionCount: 0
				}
			}
		]);

		expect(I18n.hasMessage("info.localEventBusConnector.subscribe")).toEqual(true);
		expect(I18n.hasMessage("info.localEventBusConnector.unsubscribe")).toEqual(true);
		expect(I18n.hasMessage("info.localEventBusConnector.publish")).toEqual(true);
	});

	test("can publish with no subscribers", async () => {
		const localEventBusConnector = new LocalEventBusConnector();

		let counter = 0;
		let receivedTopic = "";
		const subscriptionId = await localEventBusConnector.subscribe<TestPayload>(
			"test",
			async event => {
				receivedTopic = event.topic;
				counter = event.data.counter;
			}
		);
		await localEventBusConnector.unsubscribe(subscriptionId);
		await localEventBusConnector.publish<TestPayload>("test", { counter: 5 });

		expect(subscriptionId.length).toEqual(32);
		expect(counter).toEqual(0);
		expect(receivedTopic).toEqual("");

		const logs = memoryEntityStorage.getStore();
		expect(logs).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000000,
				message: "subscribe",
				data: {
					topic: "test",
					subscriptionId: "00000000000000000000000000000000"
				}
			},
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000001,
				message: "unsubscribe",
				data: {
					topic: "test",
					subscriptionId: "00000000000000000000000000000000"
				}
			},
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000003,
				message: "publish",
				data: {
					topic: "test",
					eventId: "03030303030303030303030303030303",
					subscriptionCount: 0
				}
			}
		]);
		expect(I18n.hasMessage("info.localEventBusConnector.subscribe")).toEqual(true);
		expect(I18n.hasMessage("info.localEventBusConnector.unsubscribe")).toEqual(true);
		expect(I18n.hasMessage("info.localEventBusConnector.publish")).toEqual(true);
	});

	test("can log error if fail during callback", async () => {
		const localEventBusConnector = new LocalEventBusConnector();

		await localEventBusConnector.subscribe<TestPayload>("test", async event => {
			throw new GeneralError("test", "test");
		});
		await localEventBusConnector.publish<TestPayload>("test", { counter: 5 });

		const logs = memoryEntityStorage.getStore();
		delete logs[2]?.error?.[0]?.stack;

		expect(logs).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000000,
				message: "subscribe",
				data: {
					topic: "test",
					subscriptionId: "00000000000000000000000000000000"
				}
			},
			{
				id: "0303030303030303030303030303030303030303030303030303030303030303",
				level: "info",
				source: "LocalEventBusConnector",
				ts: 1724327000002,
				message: "publish",
				data: {
					topic: "test",
					eventId: "02020202020202020202020202020202",
					subscriptionCount: 1
				}
			},
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				level: "error",
				source: "LocalEventBusConnector",
				ts: 1724327000003,
				message: "callback",
				error: [
					{
						name: "GeneralError",
						source: "test",
						message: "test.test"
					}
				],
				data: {
					topic: "test",
					subscriptionId: "00000000000000000000000000000000"
				}
			}
		]);
		expect(I18n.hasMessage("info.localEventBusConnector.subscribe")).toEqual(true);
		expect(I18n.hasMessage("info.localEventBusConnector.publish")).toEqual(true);
		expect(I18n.hasMessage("error.localEventBusConnector.callback")).toEqual(true);
	});
});
