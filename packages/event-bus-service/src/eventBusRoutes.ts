// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	INoContentResponse,
	ISocketRequestContext,
	ISocketRoute,
	ITag
} from "@twin.org/api-models";
import { ComponentFactory, Guards } from "@twin.org/core";
import type {
	IEventBusComponent,
	IEventBusPublish,
	IEventBusSubscribeRequest,
	IEventBusSubscribeResponse,
	IEventBusUnsubscribeRequest
} from "@twin.org/event-bus-models";
import { nameof } from "@twin.org/nameof";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "eventBusRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsEventBus: ITag[] = [
	{
		name: "Event Bus",
		description: "Endpoints which are modelled to access an event bus contract."
	}
];

/**
 * The socket routes for event bus.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateSocketRoutesEventBus(
	baseRouteName: string,
	componentName: string
): ISocketRoute[] {
	const socketSubscriptions = new Map<string, string[]>();

	const subscribeRoute: ISocketRoute<
		IEventBusSubscribeRequest,
		IEventBusSubscribeResponse | IEventBusPublish
	> = {
		operationId: "eventBusSubscribe",
		path: `${baseRouteName}/subscribe`,
		handler: async (httpRequestContext, request, emitter) => {
			const subscriptionId = await eventBusSubscribe(
				httpRequestContext,
				componentName,
				request,
				emitter
			);
			const existing = socketSubscriptions.get(httpRequestContext.socketId) ?? [];
			socketSubscriptions.set(httpRequestContext.socketId, [...existing, subscriptionId]);
		},
		disconnected: async socketRequestContext => {
			const subscriptionIds = socketSubscriptions.get(socketRequestContext.socketId);
			if (subscriptionIds) {
				socketSubscriptions.delete(socketRequestContext.socketId);
				const component = ComponentFactory.get<IEventBusComponent>(componentName);
				for (const subscriptionId of subscriptionIds) {
					await component.unsubscribe(subscriptionId);
				}
			}
		}
	};

	const unsubscribeRoute: ISocketRoute<IEventBusUnsubscribeRequest, INoContentResponse> = {
		operationId: "eventBusUnsubscribe",
		path: `${baseRouteName}/unsubscribe`,
		handler: async (httpRequestContext, request, emitter) => {
			await eventBusUnsubscribe(httpRequestContext, componentName, request, emitter);
			const existing = socketSubscriptions.get(httpRequestContext.socketId);
			if (existing) {
				const updated = existing.filter(id => id !== request.body.subscriptionId);
				if (updated.length === 0) {
					socketSubscriptions.delete(httpRequestContext.socketId);
				} else {
					socketSubscriptions.set(httpRequestContext.socketId, updated);
				}
			}
		}
	};

	return [subscribeRoute, unsubscribeRoute];
}

/**
 * Subscribe to a topic.
 * @param socketRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param emitter The emitter to send message back.
 * @returns A promise that resolves when the subscribe response has been emitted to the caller.
 */
export async function eventBusSubscribe(
	socketRequestContext: ISocketRequestContext,
	componentName: string,
	request: IEventBusSubscribeRequest,
	emitter: (topic: string, response: IEventBusSubscribeResponse | IEventBusPublish) => Promise<void>
): Promise<string> {
	Guards.object<IEventBusSubscribeRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.body.topic), request.body.topic);

	const component = ComponentFactory.get<IEventBusComponent>(componentName);
	const subscriptionId = await component.subscribe(request.body.topic, async event => {
		await emitter("publish", {
			body: event
		});
	});

	await emitter("subscribe", {
		body: {
			topic: request.body.topic,
			subscriptionId
		}
	});

	return subscriptionId;
}

/**
 * Unsubscribe from a topic.
 * @param socketRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param emitter The emitter to send message back.
 * @returns A promise that resolves when the unsubscribe has been processed.
 */
export async function eventBusUnsubscribe(
	socketRequestContext: ISocketRequestContext,
	componentName: string,
	request: IEventBusUnsubscribeRequest,
	emitter: (topic: string, response: INoContentResponse) => Promise<void>
): Promise<void> {
	Guards.object<IEventBusUnsubscribeRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.stringValue(
		ROUTES_SOURCE,
		nameof(request.body.subscriptionId),
		request.body.subscriptionId
	);

	const component = ComponentFactory.get<IEventBusComponent>(componentName);
	await component.unsubscribe(request.body.subscriptionId);
}
