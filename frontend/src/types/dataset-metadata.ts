// Mirrors the backend DatasetMetadata contract (public API shape only).

export type Primitive = string | number | boolean | null;

export type ColumnType = 'string' | 'integer' | 'decimal' | 'boolean' | 'date' | 'timestamp' | 'unknown';

export interface ColumnStats {
  min?: Primitive;
  max?: Primitive;
  avg?: number;
  median?: number;
  zeroCount?: number;
  negativeCount?: number;
}

export interface TopValue {
  value: Primitive;
  count: number;
  percentage: number;
}

export interface ColumnMetadata {
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
}

export type DatasetWarningType =
  | 'NULL_VALUES'
  | 'NEGATIVE_VALUES'
  | 'MIXED_TYPES'
  | 'TYPE_INFERENCE'
  | 'HIGH_CARDINALITY'
  | 'OTHER';

export interface DatasetWarning {
  type: DatasetWarningType;
  column?: string;
  message: string;
}

export interface DatasetMetadata {
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
    statisticsMode: 'full' | 'sampled';
  };
}
