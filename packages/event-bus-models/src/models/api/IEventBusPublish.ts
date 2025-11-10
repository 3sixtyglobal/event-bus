// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEvent } from "../IEvent.js";

/**
 * Publish an event on the bus.
 */
export interface IEventBusPublish {
	/**
	 * The parameters from the body.
	 */
	body: IEvent;
}
