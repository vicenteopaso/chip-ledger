/**
 * The box every text field, select, and stepper shares: 48 px tall, the surface color, and a
 * 3:1 border (REQ-0002-06, REQ-0002-31). Only fields have the control border; buttons are
 * rounded rectangles with the panel border or a fill (REQ-0005-14); notices are tinted panels
 * with a left rule, so the three never look alike.
 */
export const FIELD_BOX = "h-12 rounded-md border-control border-border-control bg-surface";

/** A text field or select: the box, with an accent border on focus. Callers add the width, padding, and text size. */
export const FIELD = `block min-w-0 ${FIELD_BOX} focus:border-accent`;
