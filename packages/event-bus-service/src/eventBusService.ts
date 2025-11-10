// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Guards } from "@twin.org/core";
import {
	EventBusConnectorFactory,
	type EventBusCallback,
	type IEventBusConnector
} from "@twin.org/event-bus-models";
import { nameof } from "@twin.org/nameof";
import type { IEventBusServiceConstructorOptions } from "./models/IEventBusServiceConstructorOptions.js";

/**
 * Class for performing event bus operations over web sockets.
 */
export class EventBusService implements IEventBusConnector {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EventBusService>();

	/**
	 * The event bus connector.
	 * @internal
	 */
	private readonly _eventBus: IEventBusConnector;

	/**
	 * Create a new instance of EventBusService.
	 * @param options The options for the connector.
	 */
	constructor(options?: IEventBusServiceConstructorOptions) {
		this._eventBus = EventBusConnectorFactory.get(options?.eventBusConnectorType ?? "event-bus");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EventBusService.CLASS_NAME;
	}

	/**
	 * Subscribe to the event bus.
	 * @param topic The topic being subscribed to.
	 * @param callback The callback to be called when the event occurs on the bus.
	 * @returns The id of the subscription, to be used in unsubscribe.
	 */
	public async subscribe<T>(topic: string, callback: EventBusCallback<T>): Promise<string> {
		Guards.stringValue(EventBusService.CLASS_NAME, nameof(topic), topic);
		Guards.function(EventBusService.CLASS_NAME, nameof(callback), callback);

		return this._eventBus.subscribe(topic, callback);
	}

	/**
	 * Unsubscribe from the event bus.
	 * @param subscriptionId The subscription to unsubscribe.
	 * @returns Nothing.
	 */
	public async unsubscribe(subscriptionId: string): Promise<void> {
		Guards.stringValue(EventBusService.CLASS_NAME, nameof(subscriptionId), subscriptionId);

		return this._eventBus.unsubscribe(subscriptionId);
	}

	/**
	 * Publish an event to the bus.
	 * @param topic The topic to publish.
	 * @param data The data to publish.
	 * @returns Nothing.
	 */
	public async publish<T>(topic: string, data: T): Promise<void> {
		Guards.stringValue(EventBusService.CLASS_NAME, nameof(topic), topic);

		return this._eventBus.publish(topic, data);
	}
}
