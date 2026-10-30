"use client";

import { createContext, useContext } from "react";

/**
 * True where the person can look but not change anything (a watcher of a shared game, SPEC-0003
 * REQ-0003-06). The shared controls read it, so no screen has to pass a flag down: steppers drop
 * their buttons, fields become read-only, and choices are disabled. Solo play never sets it.
 */
export const ReadOnlyContext = createContext(false);

export const useReadOnly = (): boolean => useContext(ReadOnlyContext);
