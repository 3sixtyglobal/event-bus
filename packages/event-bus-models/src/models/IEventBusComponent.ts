// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { EventBusCallback } from "./eventBusCallback.js";

/**
 * Interface describing an event bus component.
 */
export interface IEventBusComponent extends IComponent {
	/**
	 * Subscribe to the event bus.
	 * @param topic The topic being subscribed to.
	 * @param callback The callback to be called when the event occurs on the bus.
	 * @returns The id of the subscription, to be used in unsubscribe.
	 */
	subscribe<T>(topic: string, callback: EventBusCallback<T>): Promise<string>;

	/**
	 * Unsubscribe from the event bus.
	 * @param subscriptionId The subscription to unsubscribe.
	 * @returns Nothing.
	 */
	unsubscribe(subscriptionId: string): Promise<void>;

	/**
	 * Publish an event to the bus.
	 * @param topic The topic to publish.
	 * @param data The data to publish.
	 * @returns Nothing.
	 */
	publish<T>(topic: string, data: T): Promise<void>;
}
