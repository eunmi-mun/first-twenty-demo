// Variable pay (#comp.variable): pay that depends on results, such as bonuses from performance evaluations and
// sales commission. There is no evaluation data in the app yet, so this tab shows the variable pay targets already
// on file (Summary table) and says what will appear here once evaluations exist.
import { useMemo } from 'react'
import { links } from '@/app/router'
import { compTable, type CompTableRow } from '@/domain/pay'
import { fmtShort, today } from '@/lib/dates'
import { pct, plural } from '@/lib/format'
import { useDB } from '@/store/db'
import { Badge, type Column, DataTable, EmptyState, Money, Panel, Private, Stat } from '@/ui'

export function VariableTab() {
  const db = useDB((s) => s.db)
  const date = today()
  const rows = useMemo(() => compTable(db, date).filter((r) => r.variable > 0), [db, date])
  const totalVariable = rows.reduce((n, r) => n + r.variable, 0)
  const totalBase = rows.reduce((n, r) => n + r.base, 0)

  const columns: Array<Column<CompTableRow>> = [
    {
      key: 'name',
      header: 'Name',
      sort: (r) => r.name,
      cell: (r) => (
        <div>
          <span className="font-semibold text-ink">{r.name}</span>
          <span className="block text-[12px] text-ink-3">{r.title}</span>
          {r.incoming && (
            <Badge tone="accent" className="mt-1">
              Starts {fmtShort(db.people.find((p) => p.id === r.personId)?.startDate)}
            </Badge>
          )}
        </div>
      ),
    },
    { key: 'base', header: 'Base', align: 'right', sort: (r) => r.base, cell: (r) => <Money value={Math.round(r.base)} /> },
    {
      key: 'target',
      header: 'Variable at target',
      align: 'right',
      sort: (r) => r.variable,
      cell: (r) => (
        <span className="whitespace-nowrap">
          <Money value={Math.round(r.variable)} />
          <span className="block text-[12px] text-ink-3">
            <Private>{r.variablePct >= 0.999 && r.variablePct <= 1.001 ? '50/50 OTE' : pct(r.variablePct)}</Private>
          </span>
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Performance-based bonuses"
        subtitle="Bonuses tied to performance evaluations, and the evaluations behind them."
      >
        <EmptyState
          compact
          icon="chart"
          title="No evaluation data yet"
          body="Once performance evaluations are recorded, bonuses earned from them will show here next to each person's target."
        />
      </Panel>

      <Panel
        title="Variable pay targets"
        subtitle="What each person earns on top of base if targets are met. Set when pay is changed; see Summary table."
      >
        {rows.length === 0 ? (
          <EmptyState compact icon="coins" title="No one has variable pay" body="Add a variable amount when you change someone's pay and it appears here." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Stat label="People with variable pay" value={plural(rows.length, 'person', 'people')} />
              <Stat label="Variable at target, a year" value={<Money value={Math.round(totalVariable)} short />} />
              <Stat label="Share of their base" value={<Private>{totalBase > 0 ? pct(totalVariable / totalBase) : ''}</Private>} sub="At target" />
            </div>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(r) => r.personId}
              rowHref={(r) => links.person(r.personId, 'job')}
              initialSort={{ key: 'target', dir: 'desc' }}
              caption="Variable pay targets"
            />
          </>
        )}
      </Panel>
    </div>
  )
}
