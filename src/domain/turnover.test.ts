import { describe, expect, it } from 'vitest'
import { blankDB } from '@/data/blank'
import type { DB, Person, SeparationType } from '@/domain/types'
import { fmtStay, fmtStayShort, leaversByQuarter, separationKind, staysOn, turnoverLast12 } from './turnover'

const TODAY = '2026-10-23'

function person(d: DB, id: string, startDate: string, endDate?: string, type?: SeparationType): Person {
  const p: Person = {
    ...d.people[0],
    id,
    firstName: id,
    isFounder: false,
    startDate,
    endDate: endDate ?? null,
    separation: endDate && type ? { type, reason: 'Other', lastDay: endDate } : undefined,
  }
  d.people.push(p)
  return p
}

function db(): DB {
  const d = blankDB({ companyName: 'Moonrise', founderFirstName: 'Maya', founderLastName: 'Raman', foundedOn: '2025-02-03' })
  d.people[0].startDate = '2025-02-03'
  return d
}

describe('length of stay', () => {
  it('counts months from the start date to today, or to the last day for someone who left', () => {
    const d = db()
    person(d, 'p-stays', '2026-04-23')
    person(d, 'p-left', '2025-10-01', '2026-03-31', 'resigned_notice')
    person(d, 'p-future', '2026-12-01')
    const stays = staysOn(d, TODAY)
    expect(stays.map((s) => s.person.id)).toEqual([d.people[0].id, 'p-stays', 'p-left'])
    expect(stays[1].months).toBeCloseTo(6, 0)
    expect(stays[1].left).toBe(false)
    expect(stays[2].months).toBeCloseTo(6, 0)
    expect(stays[2].left).toBe(true)
  })

  it('words a stay in plain English', () => {
    expect(fmtStay(0.4)).toBe('2 weeks')
    expect(fmtStay(1)).toBe('1 month')
    expect(fmtStay(7)).toBe('7 months')
    expect(fmtStay(12)).toBe('1 year')
    expect(fmtStay(16)).toBe('1 year 4 months')
    expect(fmtStayShort(6)).toBe('6 mo')
    expect(fmtStayShort(18)).toBe('1 yr 6 mo')
    expect(fmtStayShort(24)).toBe('2 yr')
  })
})

describe('turnover', () => {
  it('sorts separation types into voluntary, involuntary and other', () => {
    expect(separationKind('resigned_notice')).toBe('voluntary')
    expect(separationKind('resigned_no_notice')).toBe('voluntary')
    expect(separationKind('terminated')).toBe('involuntary')
    expect(separationKind('laid_off')).toBe('involuntary')
    expect(separationKind('contract_ended')).toBe('other')
    expect(separationKind(undefined)).toBe('unknown')
  })

  it('counts leavers in the last 12 months only, and shows no rate for a team under five', () => {
    const d = db()
    person(d, 'p-a', '2025-03-01', '2026-08-28', 'resigned_notice')
    person(d, 'p-old', '2025-03-01', '2025-09-01', 'terminated')
    const t = turnoverLast12(d, TODAY)
    expect(t.leavers.map((p) => p.id)).toEqual(['p-a'])
    expect(t.voluntary).toBe(1)
    expect(t.involuntary).toBe(0)
    expect(t.rate).toBeNull()
  })

  it('divides leavers by average headcount once the team has five people', () => {
    const d = db()
    for (const id of ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-9']) person(d, id, '2025-03-01')
    person(d, 'p-gone', '2025-03-01', '2026-06-30', 'laid_off')
    const t = turnoverLast12(d, TODAY)
    expect(t.leavers).toHaveLength(1)
    expect(t.involuntary).toBe(1)
    expect(t.avgHeadcount).toBeGreaterThan(9)
    expect(t.avgHeadcount).toBeLessThan(11)
    expect(t.rate).toBeCloseTo(1 / t.avgHeadcount, 5)
  })

  it('counts departures by calendar quarter, ending with this quarter', () => {
    const d = db()
    person(d, 'p-a', '2025-03-01', '2026-08-28', 'resigned_notice')
    person(d, 'p-b', '2025-03-01', '2026-01-15', 'terminated')
    person(d, 'p-soon', '2025-03-01', '2026-12-18', 'resigned_notice') // last day still ahead: not counted
    const q = leaversByQuarter(d, TODAY, 4)
    expect(q.map((x) => x.label)).toEqual(['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'])
    expect(q.map((x) => x.count)).toEqual([1, 0, 1, 0])
  })
})
