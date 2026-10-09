// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISocketRequestContext } from "@3sixty/api-models";
import { ComponentFactory } from "@3sixty/core";
import { LocalEventBusConnector } from "@3sixty/event-bus-connector-local";
import type { IEventBusSubscribeResponse } from "@3sixty/event-bus-models";
import { EventBusConnectorFactory } from "@3sixty/event-bus-models";
import { generateSocketRoutesEventBus } from "../src/eventBusRoutes.js";
import { EventBusService } from "../src/eventBusService.js";

describe("eventBusRoutes", () => {
	let service: EventBusService;

	beforeEach(() => {
		const connector = new LocalEventBusConnector();
		EventBusConnectorFactory.register("event-bus", () => connector);
		service = new EventBusService({ eventBusConnectorType: "event-bus" });
		ComponentFactory.register("eventBus", () => service);
	});

	test("subscribe route emits subscribe response with topic and subscriptionId", async () => {
		const [subscribeRoute] = generateSocketRoutesEventBus("event-bus", "eventBus");

		const emitted: { topic: string; response: unknown }[] = [];
		const emitter = async (topic: string, response: unknown): Promise<void> => {
			emitted.push({ topic, response });
		};

		const ctx = { socketId: "s1" } as ISocketRequestContext;
		await Promise.resolve(subscribeRoute.handler(ctx, { body: { topic: "test" } }, emitter));

		expect(emitted).toHaveLength(1);
		expect(emitted[0].topic).toBe("subscribe");
		const body = (emitted[0].response as IEventBusSubscribeResponse).body;
		expect(body.topic).toBe("test");
		expect(body.subscriptionId).toBeDefined();
	});

	test("disconnected handler releases all subscriptions for the socket", async () => {
		const [subscribeRoute] = generateSocketRoutesEventBus("event-bus", "eventBus");
		const received: unknown[] = [];
		const ctx = { socketId: "s1" } as ISocketRequestContext;

		await Promise.resolve(
			subscribeRoute.handler(ctx, { body: { topic: "topicA" } }, async (t, r) => {
				if (t === "publish") {
					received.push(r);
				}
			})
		);
		await Promise.resolve(
			subscribeRoute.handler(ctx, { body: { topic: "topicB" } }, async (t, r) => {
				if (t === "publish") {
					received.push(r);
				}
			})
		);

		await service.publish("topicA", { value: 1 });
		await service.publish("topicB", { value: 2 });
		expect(received).toHaveLength(2);

		await Promise.resolve(subscribeRoute.disconnected?.(ctx));

		await service.publish("topicA", { value: 3 });
		await service.publish("topicB", { value: 4 });
		expect(received).toHaveLength(2);
	});

	test("disconnected handler is a no-op when socket has no subscriptions", async () => {
		const [subscribeRoute] = generateSocketRoutesEventBus("event-bus", "eventBus");
		const ctx = { socketId: "s-none" } as ISocketRequestContext;

		await expect(Promise.resolve(subscribeRoute.disconnected?.(ctx))).resolves.toBeUndefined();
	});

	test("explicit unsubscribe removes tracking so disconnect does not double-unsubscribe", async () => {
		const [subscribeRoute, unsubscribeRoute] = generateSocketRoutesEventBus(
			"event-bus",
			"eventBus"
		);
		const ctx = { socketId: "s1" } as ISocketRequestContext;

		let capturedSubscriptionId = "";
		await Promise.resolve(
			subscribeRoute.handler(ctx, { body: { topic: "topicA" } }, async (t, r) => {
				if (t === "subscribe") {
					capturedSubscriptionId = (r as IEventBusSubscribeResponse).body.subscriptionId;
				}
			})
		);

		const unsubscribeSpy = vi.spyOn(service, "unsubscribe");

		await Promise.resolve(
			unsubscribeRoute.handler(
				ctx,
				{ body: { subscriptionId: capturedSubscriptionId } },
				async () => {}
			)
		);
		expect(unsubscribeSpy).toHaveBeenCalledOnce();

		unsubscribeSpy.mockClear();

		await Promise.resolve(subscribeRoute.disconnected?.(ctx));
		expect(unsubscribeSpy).not.toHaveBeenCalled();
	});

	test("subscriptions from different sockets are isolated on disconnect", async () => {
		const [subscribeRoute] = generateSocketRoutesEventBus("event-bus", "eventBus");
		const receivedS1: unknown[] = [];
		const receivedS2: unknown[] = [];
		const ctxS1 = { socketId: "s1" } as ISocketRequestContext;
		const ctxS2 = { socketId: "s2" } as ISocketRequestContext;

		await Promise.resolve(
			subscribeRoute.handler(ctxS1, { body: { topic: "shared" } }, async (t, r) => {
				if (t === "publish") {
					receivedS1.push(r);
				}
			})
		);
		await Promise.resolve(
			subscribeRoute.handler(ctxS2, { body: { topic: "shared" } }, async (t, r) => {
				if (t === "publish") {
					receivedS2.push(r);
				}
			})
		);

		await service.publish("shared", { value: 1 });
		expect(receivedS1).toHaveLength(1);
		expect(receivedS2).toHaveLength(1);

		await Promise.resolve(subscribeRoute.disconnected?.(ctxS1));

		await service.publish("shared", { value: 2 });
		expect(receivedS1).toHaveLength(1);
		expect(receivedS2).toHaveLength(2);
	});
});
