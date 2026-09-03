// Dataset profiling metadata (schema + data characteristics).
// These types are already finalized and shared across the feature's layers.
// Pure domain — no framework or infrastructure dependencies.

export type Primitive = string | number | boolean | null;

export type ColumnType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'unknown';

export type ColumnStats = {
  min?: Primitive;
  max?: Primitive;
  avg?: number;
  median?: number;
  zeroCount?: number;
  negativeCount?: number;
};

export type TopValue = {
  value: Primitive;
  count: number;
  percentage: number;
};

export type ColumnMetadata = {
  name: string;
  type: ColumnType;

  nullable: boolean;
  nullCount: number;
  nullPercentage: number;

  distinctCount?: number;
  uniquenessRatio?: number;

  sampleValues: Primitive[];

  stats?: ColumnStats;

  topValues?: TopValue[];
};

export type DatasetWarningType =
  | 'NULL_VALUES'
  | 'NEGATIVE_VALUES'
  | 'MIXED_TYPES'
  | 'TYPE_INFERENCE'
  | 'HIGH_CARDINALITY'
  | 'OTHER';

export type DatasetWarning = {
  type: DatasetWarningType;
  column?: string;
  message: string;
};

export type DatasetMetadata = {
  version: '1';

  dataset: {
    filename: string;
    rowCount: number;
    columnCount: number;
  };

  columns: ColumnMetadata[];

  warnings: DatasetWarning[];

  profiling: {
    generatedAt: string;
    // 'full' = statistics computed over every row (exact). A future 'sampled'
    // mode could trade accuracy for speed on very large files.
    statisticsMode: 'full' | 'sampled';
  };
};
