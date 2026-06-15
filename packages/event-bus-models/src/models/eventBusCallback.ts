// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEvent } from "./IEvent.js";

/**
 * Callback invoked when an event is received on a subscribed topic.
 */
export type EventBusCallback<T> = (event: IEvent<T>) => Promise<void>;
