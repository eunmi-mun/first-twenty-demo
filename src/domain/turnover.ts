// Length of stay and turnover for HR analysis (#analysis). Pure functions over the DB; every date is a parameter.
// A last day is inclusive: a person whose endDate is today is still employed today (see isEmployedOn).
import { headcountOn } from '@/domain/people'
import type { DB, Person, SeparationType } from '@/domain/types'
import { addDays, addMonths, daysBetween, fmtQuarter, type ISODate, nextQuarter, quarterOf } from '@/lib/dates'

const DAYS_PER_MONTH = 30.4375

export type Stay = { person: Person; months: number; left: boolean }

/** How long each person has been here (or was, for someone who left), in months. Not-yet-started people are left out. */
export function staysOn(db: DB, date: ISODate): Stay[] {
  const out: Stay[] = []
  for (const person of db.people) {
    if (person.startDate > date) continue
    const left = !!person.endDate && person.endDate < date
    const end = left ? (person.endDate as ISODate) : date
    out.push({ person, left, months: (daysBetween(person.startDate, end) + 1) / DAYS_PER_MONTH })
  }
  return out
}

/** "7 months", "1 year 4 months", "3 weeks" for a stay in months. */
export function fmtStay(months: number): string {
  if (months < 1) {
    const weeks = Math.max(1, Math.round((months * DAYS_PER_MONTH) / 7))
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }
  const total = Math.round(months)
  const y = Math.floor(total / 12)
  const m = total % 12
  const yy = y ? `${y} ${y === 1 ? 'year' : 'years'}` : ''
  const mm = m ? `${m} ${m === 1 ? 'month' : 'months'}` : ''
  return [yy, mm].filter(Boolean).join(' ')
}

/** Short axis label: "6 mo", "1 yr", "1 yr 6 mo". */
export function fmtStayShort(months: number): string {
  const total = Math.round(months)
  if (total < 12) return `${total} mo`
  const y = Math.floor(total / 12)
  const m = total % 12
  return m ? `${y} yr ${m} mo` : `${y} yr`
}

export const SEPARATION_LABEL: Record<SeparationType, string> = {
  resigned_notice: 'Resigned with notice',
  resigned_no_notice: 'Resigned without notice',
  terminated: 'Terminated',
  laid_off: 'Laid off',
  contract_ended: 'Contract ended',
}

/** Resignations are the person's choice; terminations and layoffs are the company's; a contract ending is neither. */
export function separationKind(type: SeparationType | undefined): 'voluntary' | 'involuntary' | 'other' | 'unknown' {
  if (!type) return 'unknown'
  if (type === 'resigned_notice' || type === 'resigned_no_notice') return 'voluntary'
  if (type === 'terminated' || type === 'laid_off') return 'involuntary'
  return 'other'
}

/** People whose last day fell from `from` through `to` (both inclusive), most recent first. */
export function leaversBetween(db: DB, from: ISODate, to: ISODate): Person[] {
  return db.people
    .filter((p) => p.endDate && p.endDate >= from && p.endDate <= to)
    .sort((a, b) => (b.endDate as string).localeCompare(a.endDate as string))
}

export type Turnover = {
  from: ISODate
  to: ISODate
  leavers: Person[]
  voluntary: number
  involuntary: number
  other: number
  unknown: number
  /** Average headcount over the window (sampled monthly). */
  avgHeadcount: number
  /** Leavers over average headcount; null when the team is too small for a rate to mean anything (under 5). */
  rate: number | null
}

/** Turnover over the 12 months before `date` (the window ends yesterday, matching "former" in People). */
export function turnoverLast12(db: DB, date: ISODate): Turnover {
  const to = addDays(date, -1)
  const from = addMonths(date, -12)
  const leavers = leaversBetween(db, from, to)
  let sum = 0
  for (let i = 0; i <= 12; i++) sum += headcountOn(db, addMonths(from, i))
  const avgHeadcount = sum / 13
  const kinds = leavers.map((p) => separationKind(p.separation?.type))
  return {
    from,
    to,
    leavers,
    voluntary: kinds.filter((k) => k === 'voluntary').length,
    involuntary: kinds.filter((k) => k === 'involuntary').length,
    other: kinds.filter((k) => k === 'other').length,
    unknown: kinds.filter((k) => k === 'unknown').length,
    avgHeadcount,
    rate: avgHeadcount >= 5 ? leavers.length / avgHeadcount : null,
  }
}

/** Departures in each of the last `n` calendar quarters, oldest first, ending with the quarter of `date`. Counts only last days already past. */
export function leaversByQuarter(db: DB, date: ISODate, n = 4): Array<{ quarter: string; label: string; count: number }> {
  const last = quarterOf(date)
  const out: Array<{ quarter: string; label: string; count: number }> = []
  for (let i = n - 1; i >= 0; i--) {
    const q = nextQuarter(last, -i)
    const count = db.people.filter((p) => p.endDate && p.endDate < date && quarterOf(p.endDate) === q).length
    out.push({ quarter: q, label: fmtQuarter(q), count })
  }
  return out
}

