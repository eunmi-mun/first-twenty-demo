// Turnover: who left in the last 12 months, the rate, how they left, departures by quarter, and everyone who has left.
import { useMemo } from 'react'
import { links } from '@/app/router'
import { fullName } from '@/domain/people'
import { fmtStay, leaversByQuarter, SEPARATION_LABEL, separationKind, turnoverLast12 } from '@/domain/turnover'
import type { Person } from '@/domain/types'
import { daysBetween, fmtDate, today } from '@/lib/dates'
import { plural } from '@/lib/format'
import { useDB } from '@/store/db'
import { Badge, BarList, type Column, DataTable, EmptyState, Panel, Stat } from '@/ui'

const DAYS_PER_MONTH = 30.4375

function stayMonths(p: Person): number {
  return (daysBetween(p.startDate, p.endDate as string) + 1) / DAYS_PER_MONTH
}

export function TurnoverTab() {
  const db = useDB((s) => s.db)
  const t = today()
  const { turnover, quarters, everyone } = useMemo(() => {
    return {
      turnover: turnoverLast12(db, t),
      quarters: leaversByQuarter(db, t, 4),
      everyone: db.people.filter((p) => p.endDate && p.endDate < t),
    }
  }, [db, t])

  const columns: Array<Column<Person>> = [
    { key: 'name', header: 'Name', cell: (p) => <span className="font-semibold text-ink">{fullName(p)}</span>, sort: (p) => fullName(p) },
    { key: 'last', header: 'Last day', cell: (p) => fmtDate(p.endDate), sort: (p) => p.endDate },
    { key: 'stay', header: 'Length of stay', cell: (p) => fmtStay(stayMonths(p)), sort: (p) => stayMonths(p), hideBelow: 'sm' },
    {
      key: 'how',
      header: 'How they left',
      cell: (p) =>
        p.separation ? (
          <Badge tone={separationKind(p.separation.type) === 'involuntary' ? 'warn' : 'neutral'}>{SEPARATION_LABEL[p.separation.type]}</Badge>
        ) : (
          <span className="text-ink-3">Not recorded</span>
        ),
      sort: (p) => p.separation?.type ?? '',
    },
    { key: 'why', header: 'Reason', cell: (p) => p.separation?.reason ?? <span className="text-ink-3">Not recorded</span>, hideBelow: 'md' },
    {
      key: 'rehire',
      header: 'Rehire',
      cell: (p) => (p.separation?.rehireEligible == null ? <span className="text-ink-3">Not set</span> : p.separation.rehireEligible ? 'Eligible' : 'Not eligible'),
      hideBelow: 'md',
    },
  ]

  const rateText = turnover.rate == null ? 'Too few people' : `${Math.round(turnover.rate * 100)}%`
  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Turnover, last 12 months"
        subtitle={`${fmtDate(turnover.from)} to ${fmtDate(turnover.to)}. The rate is people who left divided by average headcount, and shows once the team averages five or more.`}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label="People who left" value={turnover.leavers.length} />
          <Stat
            label="Turnover rate"
            value={rateText}
            sub={turnover.rate == null ? `Average headcount ${turnover.avgHeadcount.toFixed(1)}` : `of ${turnover.avgHeadcount.toFixed(1)} average headcount`}
          />
          <Stat label="Resigned" value={turnover.voluntary} sub="Their choice" />
          <Stat label="Company-led" value={turnover.involuntary} sub={turnover.other ? `Terminated or laid off; ${turnover.other} contract ended` : 'Terminated or laid off'} />
        </div>
      </Panel>

      <Panel title="Departures by quarter" subtitle="Last four calendar quarters, counted by last day.">
        <BarList
          ariaLabel="People who left in each of the last four quarters"
          items={quarters.map((q) => ({
            key: q.quarter,
            label: q.label,
            value: q.count,
            display: plural(q.count, 'person', 'people'),
          }))}
          max={Math.max(1, ...quarters.map((q) => q.count))}
        />
      </Panel>

      <Panel title="People who left" subtitle="Everyone whose last day has passed. Open a name for their record.">
        <DataTable
          rows={everyone}
          columns={columns}
          rowKey={(p) => p.id}
          rowHref={(p) => links.person(p.id)}
          initialSort={{ key: 'last', dir: 'desc' }}
          caption="People who left"
          empty={<EmptyState compact icon="users" title="No one has left yet" body="People appear here after you offboard them from their profile." />}
        />
      </Panel>
    </div>
  )
}
