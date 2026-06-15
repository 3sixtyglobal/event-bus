// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ComponentFactory, GeneralError, RandomHelper } from "@twin.org/core";
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
import { LocalEventBusConnector } from "../src/localEventBusConnector.js";

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

function expectHexString(value: string | undefined, length: number): void {
	expect(value).toMatch(new RegExp(`^[0-9a-f]{${length}}$`, "u"));
}

function expectLogEntry(
	log: LogEntry | undefined,
	expected: Pick<LogEntry, "level" | "source" | "message"> & {
		data?: { [key: string]: unknown };
		error?: unknown;
	}
): void {
	expect(log).toBeDefined();
	expectHexString(log?.id, 64);
	expect(log?.ts).toBeGreaterThanOrEqual(FIRST_TIMESTAMP);
	expect(log).toMatchObject(expected);
}

describe("LocalEventBusConnector", () => {
	beforeAll(async () => {
		initSchema();
	});

	beforeEach(() => {
		memoryEntityStorage = new MemoryEntityStorageConnector<LogEntry>({
			entitySchema: nameof<LogEntry>(),
			config: { storageKey: "log-entry" }
		});

		EntityStorageConnectorFactory.register("log-entry", () => memoryEntityStorage);
		ComponentFactory.register("platform", () => ({
			className: () => "platform",
			isMultiTenant: () => false,
			execute: async (method: () => Promise<void>) => method()
		}));
		LoggingConnectorFactory.register(
			"logging",
			() =>
				new EntityStorageLoggingConnector({
					config: {
						batchSize: 1,
						batchIntervalMs: 0
					}
				})
		);
		ComponentFactory.register("logging", () => new LoggingService());

		let timeCounter: number = 0;
		const mockNow = vi.fn();
		mockNow.mockImplementation(() => FIRST_TIMESTAMP + timeCounter++);
		Date.now = mockNow;

		let counter = 1;
		RandomHelper.generate = vi
			.fn()
			.mockImplementation(length => new Uint8Array(length).fill(counter++));
	});

	afterEach(async () => {
		await memoryEntityStorage.teardown();
	});

	test("can construct with dependencies", async () => {
		const localEventBusConnector = new LocalEventBusConnector();
		expect(localEventBusConnector).toBeDefined();
	});

	test("can subscribe to a topic and get a subscription id", async () => {
		const localEventBusConnector = new LocalEventBusConnector({ loggingComponentType: "logging" });

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

		const logs = await memoryEntityStorage.getStore();
		expect(logs).toHaveLength(2);
		expectLogEntry(logs[0], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "subscribe",
			data: {
				topic: "test",
				subscriptionId
			}
		});
		expectLogEntry(logs[1], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "publish",
			data: {
				topic: "test",
				subscriptionCount: 1
			}
		});
		expectHexString((logs[1].data as { eventId?: string }).eventId, 32);
		expect(logs[0].ts).toBeLessThan(logs[1].ts);
	});

	test("can unsubscribe from a topic", async () => {
		const localEventBusConnector = new LocalEventBusConnector({ loggingComponentType: "logging" });

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

		const logs = await memoryEntityStorage.getStore();
		expect(logs).toHaveLength(3);
		expectLogEntry(logs[0], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "subscribe",
			data: {
				topic: "test",
				subscriptionId
			}
		});
		expectLogEntry(logs[1], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "unsubscribe",
			data: {
				topic: "test",
				subscriptionId
			}
		});
		expectLogEntry(logs[2], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "publish",
			data: {
				topic: "test",
				subscriptionCount: 0
			}
		});
		expectHexString((logs[2].data as { eventId?: string }).eventId, 32);
		expect(logs[0].ts).toBeLessThan(logs[1].ts);
		expect(logs[1].ts).toBeLessThan(logs[2].ts);
	});

	test("can publish with no subscribers", async () => {
		const localEventBusConnector = new LocalEventBusConnector({ loggingComponentType: "logging" });

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

		const logs = await memoryEntityStorage.getStore();
		expect(logs).toHaveLength(3);
		expectLogEntry(logs[0], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "subscribe",
			data: {
				topic: "test",
				subscriptionId
			}
		});
		expectLogEntry(logs[1], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "unsubscribe",
			data: {
				topic: "test",
				subscriptionId
			}
		});
		expectLogEntry(logs[2], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "publish",
			data: {
				topic: "test",
				subscriptionCount: 0
			}
		});
		expectHexString((logs[2].data as { eventId?: string }).eventId, 32);
		expect(logs[0].ts).toBeLessThan(logs[1].ts);
		expect(logs[1].ts).toBeLessThan(logs[2].ts);
	});

	test("can log error if fail during callback", async () => {
		const localEventBusConnector = new LocalEventBusConnector({ loggingComponentType: "logging" });

		const subscriptionId = await localEventBusConnector.subscribe<TestPayload>(
			"test",
			async event => {
				throw new GeneralError("test", "test");
			}
		);
		await localEventBusConnector.publish<TestPayload>("test", { counter: 5 });

		const logs = await memoryEntityStorage.getStore();
		delete logs[2]?.error?.[0]?.stack;

		expect(logs).toHaveLength(3);
		expectLogEntry(logs[0], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "subscribe",
			data: {
				topic: "test",
				subscriptionId
			}
		});
		expectLogEntry(logs[1], {
			level: "info",
			source: "LocalEventBusConnector",
			message: "publish",
			data: {
				topic: "test",
				subscriptionCount: 1
			}
		});
		expectHexString((logs[1].data as { eventId?: string }).eventId, 32);
		expectLogEntry(logs[2], {
			level: "error",
			source: "LocalEventBusConnector",
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
				subscriptionId
			}
		});
		expect(logs[0].ts).toBeLessThan(logs[1].ts);
		expect(logs[1].ts).toBeLessThan(logs[2].ts);
	});
});
