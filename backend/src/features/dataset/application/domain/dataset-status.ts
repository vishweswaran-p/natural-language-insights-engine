// Lifecycle status of an uploaded dataset.
//
// Expressed as a const object + derived union rather than a TS `enum` to avoid
// enum runtime quirks while keeping named constants for referencing in code.

export const DatasetStatus = {
  Processing: 'PROCESSING',
  Ready: 'READY',
  Failed: 'FAILED',
} as const;

export type DatasetStatus = (typeof DatasetStatus)[keyof typeof DatasetStatus];
