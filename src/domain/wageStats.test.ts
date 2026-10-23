import { describe, expect, it } from 'vitest'
import { kernelDensity, quantile, silvermanBandwidth, summarize, wageDensity } from './wageStats'

describe('wage statistics', () => {
  it('summarizes a sorted list', () => {
    const s = summarize([100, 200, 300, 400, 500])
    expect(s).toEqual({ n: 5, min: 100, q1: 200, median: 300, mean: 300, q3: 400, max: 500 })
  })

  it('interpolates quantiles and handles empty and single lists', () => {
    expect(quantile([10, 20], 0.5)).toBe(15)
    expect(quantile([], 0.5)).toBe(0)
    expect(summarize([]).n).toBe(0)
    expect(summarize([70]).median).toBe(70)
  })

  it('picks a positive bandwidth, even when everyone is paid the same', () => {
    expect(silvermanBandwidth([100, 120, 140, 200, 260])).toBeGreaterThan(0)
    expect(silvermanBandwidth([100, 100, 100])).toBeGreaterThan(0)
    expect(silvermanBandwidth([100])).toBeGreaterThan(0)
  })

  it('draws a curve that peaks near the data and integrates to about one', () => {
    const wages = [90_000, 95_000, 100_000, 105_000, 110_000, 180_000]
    const { points, bandwidth } = wageDensity(wages, 400)
    expect(bandwidth).toBeGreaterThan(0)
    const peak = points.reduce((a, b) => (b.y > a.y ? b : a))
    expect(peak.x).toBeGreaterThan(90_000)
    expect(peak.x).toBeLessThan(115_000)
    let area = 0
    for (let i = 1; i < points.length; i++) area += ((points[i].y + points[i - 1].y) / 2) * (points[i].x - points[i - 1].x)
    expect(area).toBeGreaterThan(0.97)
    expect(area).toBeLessThan(1.01)
  })

  it('returns nothing for no data or a flat range', () => {
    expect(wageDensity([]).points).toEqual([])
    expect(kernelDensity([1, 2], 1, 5, 5)).toEqual([])
    expect(kernelDensity([1, 2], 0, 0, 5)).toEqual([])
  })
})
