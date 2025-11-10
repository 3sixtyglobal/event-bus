// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEvent } from "./IEvent.js";

/**
 * Interface describing a event bus callback method.
 */
export type EventBusCallback<T> = (event: IEvent<T>) => Promise<void>;
