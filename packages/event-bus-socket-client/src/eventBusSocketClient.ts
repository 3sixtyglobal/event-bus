// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseSocketClient } from "@twin.org/api-core";
import type { IHttpResponse } from "@twin.org/api-models";
import {
	BaseError,
	ComponentFactory,
	Converter,
	Guards,
	Is,
	NotSupportedError,
	RandomHelper,
	type IError
} from "@twin.org/core";
import type {
	EventBusCallback,
	IEvent,
	IEventBusComponent,
	IEventBusSubscribeRequest,
	IEventBusSubscribeResponse,
	IEventBusUnsubscribeRequest
} from "@twin.org/event-bus-models";
import type { ILoggingComponent } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import type { IEventBusSocketClientConstructorOptions } from "./models/IEventBusSocketClientConstructorOptions";

/**
 * Event bus which publishes using REST API and websockets.
 */
export class EventBusSocketClient extends BaseSocketClient implements IEventBusComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EventBusSocketClient>();

	/**
	 * The logging service for information.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Subscriptions to the events.
	 * @internal
	 */
	private readonly _subscriptions: {
		[topic: string]: {
			subscriptionId?: string;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			subscriberCallbacks: { [subscriptionId: string]: EventBusCallback<any> };
		};
	};

	/**
	 * Create a new instance of EventBusSocketClient.
	 * @param options Options for the client.
	 */
	constructor(options: IEventBusSocketClientConstructorOptions) {
		super(nameof<EventBusSocketClient>(), options?.config, "event-bus");

		this._subscriptions = {};

		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType ?? "logging");

		super.onEvent<IEventBusSubscribeResponse>("subscribe", async data =>
			this.subscribeResponse(data)
		);
		super.onEvent<IHttpResponse<IEvent<unknown>>>("publish", async data =>
			this.incomingPublish(data)
		);
	}

	/**
	 * Subscribe to the event bus.
	 * @param topic The topic being subscribed to.
	 * @param callback The callback to be called when the event occurs on the bus.
	 * @returns The id of the subscription, to be used in unsubscribe.
	 */
	public async subscribe<T>(topic: string, callback: EventBusCallback<T>): Promise<string> {
		Guards.stringValue(EventBusSocketClient.CLASS_NAME, nameof(topic), topic);
		Guards.function(EventBusSocketClient.CLASS_NAME, nameof(callback), callback);

		const subscriptionId = Converter.bytesToHex(RandomHelper.generate(16));

		this._subscriptions[topic] ??= { subscriberCallbacks: {} };
		this._subscriptions[topic].subscriberCallbacks[subscriptionId] = callback;

		// If this the first subscription for the topic then send a subscribe to the socket.
		if (!Is.stringValue(this._subscriptions[topic].subscriptionId) && super.socketConnect()) {
			const request: IEventBusSubscribeRequest = {
				body: {
					topic
				}
			};
			super.sendEvent("subscribe", request);
		}

		await this._logging?.log({
			level: "info",
			source: EventBusSocketClient.CLASS_NAME,
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
		Guards.stringValue(EventBusSocketClient.CLASS_NAME, nameof(subscriptionId), subscriptionId);

		for (const topic in this._subscriptions) {
			if (this._subscriptions[topic].subscriberCallbacks[subscriptionId]) {
				await this._logging?.log({
					level: "info",
					source: EventBusSocketClient.CLASS_NAME,
					ts: Date.now(),
					message: "unsubscribe",
					data: {
						topic,
						subscriptionId
					}
				});

				// We found the subscription id so remove it.
				delete this._subscriptions[topic].subscriberCallbacks[subscriptionId];

				// If the subscriptions are empty then remove the topic as well.
				if (Object.keys(this._subscriptions[topic].subscriberCallbacks).length === 0) {
					const socketSubscriptionId = this._subscriptions[topic].subscriptionId;
					delete this._subscriptions[topic];

					// If there are no more subscriptions for the topic then send an unsubscribe to the socket.
					if (super.socketConnect() && Is.stringValue(socketSubscriptionId)) {
						const request: IEventBusUnsubscribeRequest = {
							body: {
								subscriptionId: socketSubscriptionId
							}
						};
						super.sendEvent("unsubscribe", request);
					}
				}
			}
		}

		// There are no more subscriptions so disconnect the socket
		if (Object.keys(this._subscriptions).length === 0) {
			super.socketDisconnect();
		}
	}

	/**
	 * Publish an event to the bus.
	 * @param topic The topic to publish.
	 * @param data The data to publish.
	 * @returns Nothing.
	 */
	public async publish<T>(topic: string, data: T): Promise<void> {
		throw new NotSupportedError(EventBusSocketClient.CLASS_NAME, "notSupportedOnClient", {
			methodName: "publish"
		});
	}

	/**
	 * Handle the socket connection.
	 */
	protected async handleConnected(): Promise<void> {
		// The socket has reconnected so send subscribe requests
		// all the current subscriptions
		for (const topic in this._subscriptions) {
			const subscribeEmit: IEventBusSubscribeRequest = {
				body: {
					topic
				}
			};
			super.sendEvent("subscribe", subscribeEmit);
		}
	}

	/**
	 * Handle an error.
	 * @param err The error to handle.
	 */
	protected async handleError(err: IError): Promise<void> {
		await this._logging?.log({
			level: "error",
			source: EventBusSocketClient.CLASS_NAME,
			ts: Date.now(),
			message: "socketConnect",
			error: err
		});
	}

	/**
	 * Handle an incoming subscribe event.
	 * @param publishEmit The incoming data.
	 * @internal
	 */
	private async subscribeResponse(subscribeResponse: IEventBusSubscribeResponse): Promise<void> {
		// Capture the subscription id from the subscribe request
		// so that we can use it in unsubscribe later
		this._subscriptions[subscribeResponse.body.topic].subscriptionId =
			subscribeResponse.body.subscriptionId;
	}

	/**
	 * Handle an incoming publish event.
	 * @param topic The incoming topic.
	 * @param event The incoming data.
	 * @internal
	 */
	private async incomingPublish(event: IHttpResponse<IEvent<unknown>>): Promise<void> {
		if (!Is.empty(event.body) && this._subscriptions[event.body.topic]) {
			for (const subscriptionId in this._subscriptions[event.body.topic].subscriberCallbacks) {
				try {
					await this._subscriptions[event.body.topic].subscriberCallbacks[subscriptionId](
						event.body
					);
				} catch (error) {
					await this._logging?.log({
						level: "error",
						source: EventBusSocketClient.CLASS_NAME,
						ts: Date.now(),
						message: "callback",
						error: BaseError.fromError(error),
						data: {
							topic: event.body.topic,
							subscriptionId
						}
					});
				}
			}
		}
	}
}
