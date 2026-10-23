// Wage statistics for HR analysis (#analysis): the pay of everyone employed on a date, and a smooth density
// curve over it. Pure functions over the DB; every date is a parameter.
import { annualBase, currentComp } from '@/domain/pay'
import { employedOn } from '@/domain/people'
import type { DB } from '@/domain/types'
import type { ISODate } from '@/lib/dates'

/** Annual base pay (USD) of each person employed on `date`, lowest first. Hourly pay counts at scheduled hours. */
export function wagesOn(db: DB, date: ISODate): number[] {
  const out: number[] = []
  for (const p of employedOn(db, date)) {
    const rec = currentComp(db, p.id, date)
    if (!rec) continue
    const pay = annualBase(rec, p.hoursPerWeek)
    if (pay > 0) out.push(pay)
  }
  return out.sort((a, b) => a - b)
}

export type WageSummary = { n: number; min: number; q1: number; median: number; mean: number; q3: number; max: number }

/** Linear-interpolated quantile of a sorted list (q between 0 and 1). */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function summarize(sorted: number[]): WageSummary {
  const n = sorted.length
  const mean = n ? sorted.reduce((a, b) => a + b, 0) / n : 0
  return {
    n,
    min: sorted[0] ?? 0,
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    mean,
    q3: quantile(sorted, 0.75),
    max: sorted[n - 1] ?? 0,
  }
}

/**
 * Silverman's rule of thumb for a Gaussian kernel: 0.9 x min(sd, IQR / 1.34) x n^(-1/5).
 * Falls back to a share of the value when everyone is paid the same, so the curve is still drawn.
 */
export function silvermanBandwidth(sorted: number[]): number {
  const n = sorted.length
  if (n < 2) return Math.max(1, (sorted[0] ?? 0) * 0.1)
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1))
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25)
  const spread = iqr > 0 ? Math.min(sd, iqr / 1.34) : sd
  const h = 0.9 * spread * n ** -0.2
  return h > 0 ? h : Math.max(1, mean * 0.05)
}

export type DensityPoint = { x: number; y: number }

/**
 * Gaussian kernel density estimate of `values`, sampled at `steps + 1` points from `from` to `to`.
 * The area under the curve is 1 over the whole line, so y reads as "share of people per dollar".
 */
export function kernelDensity(values: number[], bandwidth: number, from: number, to: number, steps = 120): DensityPoint[] {
  if (values.length === 0 || !(bandwidth > 0) || !(to > from)) return []
  const norm = 1 / (values.length * bandwidth * Math.sqrt(2 * Math.PI))
  const out: DensityPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const x = from + ((to - from) * i) / steps
    let sum = 0
    for (const v of values) {
      const z = (x - v) / bandwidth
      sum += Math.exp(-0.5 * z * z)
    }
    out.push({ x, y: sum * norm })
  }
  return out
}

/** The density curve for a set of wages, padded three bandwidths either side and never below $0. */
export function wageDensity(sorted: number[], steps = 120): { points: DensityPoint[]; bandwidth: number } {
  if (sorted.length === 0) return { points: [], bandwidth: 0 }
  const bandwidth = silvermanBandwidth(sorted)
  const from = Math.max(0, sorted[0] - 3 * bandwidth)
  const to = sorted[sorted.length - 1] + 3 * bandwidth
  return { points: kernelDensity(sorted, bandwidth, from, to, steps), bandwidth }
}
