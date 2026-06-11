// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseError, ComponentFactory, Converter, Guards, RandomHelper } from "@twin.org/core";
import type { EventBusCallback, IEvent, IEventBusConnector } from "@twin.org/event-bus-models";
import type { ILoggingComponent } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import type { ILocalEventBusConnectorConstructorOptions } from "./models/ILocalEventBusConnectorConstructorOptions.js";

/**
 * Class for performing event bus operations locally.
 */
export class LocalEventBusConnector implements IEventBusConnector {
	/**
	 * The namespace supported by the event bus connector.
	 */
	public static readonly NAMESPACE: string = "local";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<LocalEventBusConnector>();

	/**
	 * The logger for the event bus connector.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Subscriptions to the events.
	 * @internal
	 */
	private readonly _subscriptions: {
		[topic: string]: {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			[subscriptionId: string]: EventBusCallback<any>;
		};
	};

	/**
	 * Create a new instance of LocalEventBusConnector.
	 * @param options The options for the connector.
	 */
	constructor(options?: ILocalEventBusConnectorConstructorOptions) {
		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType);
		this._subscriptions = {};
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return LocalEventBusConnector.CLASS_NAME;
	}

	/**
	 * Subscribe to the event bus.
	 * @param topic The topic being subscribed to.
	 * @param callback The callback to be called when the event occurs on the bus.
	 * @returns The id of the subscription, to be used in unsubscribe.
	 */
	public async subscribe<T>(topic: string, callback: EventBusCallback<T>): Promise<string> {
		Guards.stringValue(LocalEventBusConnector.CLASS_NAME, nameof(topic), topic);
		Guards.function(LocalEventBusConnector.CLASS_NAME, nameof(callback), callback);

		const subscriptionId = Converter.bytesToHex(RandomHelper.generate(16));

		this._subscriptions[topic] ??= {};
		this._subscriptions[topic][subscriptionId] = callback;

		await this._logging?.log({
			level: "info",
			source: LocalEventBusConnector.CLASS_NAME,
			ts: Date.now(),
			message: "subscribe",
			data: {
				topic,
				subscriptionId
			}
		});

		return subscriptionId;
	}

	/**
	 * Unsubscribe from the event bus.
	 * @param subscriptionId The subscription to unsubscribe.
	 * @returns Nothing.
	 */
	public async unsubscribe(subscriptionId: string): Promise<void> {
		Guards.stringValue(LocalEventBusConnector.CLASS_NAME, nameof(subscriptionId), subscriptionId);

		for (const topic in this._subscriptions) {
			if (this._subscriptions[topic][subscriptionId]) {
				// We found the subscription id so remove it.
				delete this._subscriptions[topic][subscriptionId];

				// If the subscriptions are empty then remove the topic as well.
				if (Object.keys(this._subscriptions[topic]).length === 0) {
					delete this._subscriptions[topic];
				}

				await this._logging?.log({
					level: "info",
					source: LocalEventBusConnector.CLASS_NAME,
					ts: Date.now(),
					message: "unsubscribe",
					data: {
						topic,
						subscriptionId
					}
				});
				return;
			}
		}
	}

	/**
	 * Publish an event to the bus.
	 * @param topic The topic to publish.
	 * @param data The data to publish.
	 * @returns Nothing.
	 */
	public async publish<T>(topic: string, data: T): Promise<void> {
		Guards.stringValue(LocalEventBusConnector.CLASS_NAME, nameof(topic), topic);

		const event: IEvent<T> = {
			id: Converter.bytesToHex(RandomHelper.generate(16)),
			ts: Date.now(),
			topic,
			data
		};

		const subscriptionCount = Object.keys(this._subscriptions[topic] ?? {}).length;

		await this._logging?.log({
			level: "info",
			source: LocalEventBusConnector.CLASS_NAME,
			ts: Date.now(),
			message: "publish",
			data: {
				topic,
				eventId: event.id,
				subscriptionCount
			}
		});

		if (subscriptionCount > 0) {
			for (const subscriptionId in this._subscriptions[topic]) {
				try {
					await this._subscriptions[topic][subscriptionId](event);
				} catch (error) {
					await this._logging?.log({
						level: "error",
						source: LocalEventBusConnector.CLASS_NAME,
						ts: Date.now(),
						message: "callback",
						error: BaseError.fromError(error),
						data: {
							topic,
							subscriptionId
						}
					});
				}
			}
		}
	}
}
