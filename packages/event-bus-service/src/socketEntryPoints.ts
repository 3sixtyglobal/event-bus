// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISocketRouteEntryPoint } from "@3sixty/api-models";
import { generateSocketRoutesEventBus, tagsEventBus } from "./eventBusRoutes.js";

/**
 * Socket route entry points for the event bus service.
 */
export const socketEntryPoints: ISocketRouteEntryPoint[] = [
	{
		name: "event-bus",
		defaultBaseRoute: "event-bus",
		tags: tagsEventBus,
		generateRoutes: generateSocketRoutesEventBus
	}
];
