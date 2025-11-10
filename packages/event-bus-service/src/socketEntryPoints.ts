// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISocketRouteEntryPoint } from "@twin.org/api-models";
import { generateSocketRoutesEventBus, tagsEventBus } from "./eventBusRoutes.js";

export const socketEntryPoints: ISocketRouteEntryPoint[] = [
	{
		name: "event-bus",
		defaultBaseRoute: "event-bus",
		tags: tagsEventBus,
		generateRoutes: generateSocketRoutesEventBus
	}
];
