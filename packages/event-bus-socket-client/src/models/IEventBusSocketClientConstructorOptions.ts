// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEventBusSocketClientConfig } from "./IEventBusSocketClientConfig.js";

/**
 * The options for the event bus socket client.
 */
export interface IEventBusSocketClientConstructorOptions {
	/**
	 * The type of logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the event bus socket client.
	 */
	config: IEventBusSocketClientConfig;
}
