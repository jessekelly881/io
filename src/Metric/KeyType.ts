/**
 * @since 1.0.0
 */
import * as internal from "@effect/io/internal/metric/keyType"
import type * as MetricBoundaries from "@effect/io/Metric/Boundaries"
import type * as MetricState from "@effect/io/Metric/State"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Duration from "@fp-ts/data/Duration"
import type * as Equal from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricKeyTypeTypeId: unique symbol = internal.MetricKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricKeyTypeTypeId = typeof MetricKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const CounterKeyTypeTypeId: unique symbol = internal.CounterKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CounterKeyTypeTypeId = typeof CounterKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const FrequencyKeyTypeTypeId: unique symbol = internal.FrequencyKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FrequencyKeyTypeTypeId = typeof FrequencyKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const GaugeKeyTypeTypeId: unique symbol = internal.GaugeKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type GaugeKeyTypeTypeId = typeof GaugeKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const HistogramKeyTypeTypeId: unique symbol = internal.HistogramKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type HistogramKeyTypeTypeId = typeof HistogramKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const SummaryKeyTypeTypeId: unique symbol = internal.SummaryKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SummaryKeyTypeTypeId = typeof SummaryKeyTypeTypeId

/**
 * @since 1.0.0
 * @category modelz
 */
export interface MetricKeyType<In, Out> extends MetricKeyType.Variance<In, Out>, Equal.Equal {}

/**
 * @since 1.0.0
 */
export declare namespace MetricKeyType {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Untyped = MetricKeyType<any, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Counter = MetricKeyType<number, MetricState.MetricState.Counter> & {
    readonly [CounterKeyTypeTypeId]: CounterKeyTypeTypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Frequency = MetricKeyType<string, MetricState.MetricState.Frequency> & {
    readonly [FrequencyKeyTypeTypeId]: FrequencyKeyTypeTypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Gauge = MetricKeyType<number, MetricState.MetricState.Gauge> & {
    readonly [GaugeKeyTypeTypeId]: GaugeKeyTypeTypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Histogram = MetricKeyType<number, MetricState.MetricState.Histogram> & {
    readonly [HistogramKeyTypeTypeId]: HistogramKeyTypeTypeId
    readonly boundaries: MetricBoundaries.MetricBoundaries
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Summary = MetricKeyType<readonly [number, number], MetricState.MetricState.Summary> & {
    readonly [SummaryKeyTypeTypeId]: SummaryKeyTypeTypeId
    readonly maxAge: Duration.Duration
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk.Chunk<number>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<In, Out> {
    readonly [MetricKeyTypeTypeId]: {
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type InType<Type extends MetricKeyType<any, any>> = [Type] extends [
    {
      readonly [MetricKeyTypeTypeId]: {
        readonly _In: (_: infer In) => void
      }
    }
  ] ? In
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type OutType<Type extends MetricKeyType<any, any>> = [Type] extends [
    {
      readonly [MetricKeyTypeTypeId]: {
        readonly _Out: (_: never) => infer Out
      }
    }
  ] ? Out
    : never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const counter = internal.counter

/**
 * @since 1.0.0
 * @category constructors
 */
export const frequency = internal.frequency

/**
 * @since 1.0.0
 * @category constructors
 */
export const gauge = internal.gauge

/**
 * @since 1.0.0
 * @category constructors
 */
export const histogram = internal.histogram

/**
 * @since 1.0.0
 * @category constructors
 */
export const summary = internal.summary

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMetricKeyType = internal.isMetricKeyType

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCounterKey = internal.isCounterKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isFrequencyKey = internal.isFrequencyKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isGaugeKey = internal.isGaugeKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHistogramKey = internal.isHistogramKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSummaryKey = internal.isSummaryKey