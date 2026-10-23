// Wage distribution: a density curve of annual base pay, with the median, quartiles and range as numbers.
import { useMemo } from 'react'
import { summarize, wageDensity, wagesOn } from '@/domain/wageStats'
import { today } from '@/lib/dates'
import { money, moneyShort, plural } from '@/lib/format'
import { useDB } from '@/store/db'
import { DensityChart, EmptyState, Money, Panel, Stat } from '@/ui'

export function WagesTab() {
  const db = useDB((s) => s.db)
  const t = today()
  const { wages, summary, curve } = useMemo(() => {
    const wages = wagesOn(db, t)
    return { wages, summary: summarize(wages), curve: wageDensity(wages) }
  }, [db, t])

  return (
    <Panel
      title="Wage distribution"
      subtitle={`Annual base pay of the ${plural(wages.length, 'person', 'people')} employed today. Hourly pay counts at scheduled hours; bonus, commission and equity are left out.`}
    >
      {wages.length < 2 ? (
        <EmptyState
          compact
          icon="chart"
          title="Not enough pay data yet"
          body="The curve needs at least two people with pay on file. Add people under People and it fills in."
        />
      ) : (
        <>
          <DensityChart
            points={curve.points}
            values={wages}
            median={summary.median}
            format={moneyShort}
            ariaLabel={`Density of annual base pay for ${plural(wages.length, 'person', 'people')}: lowest ${money(summary.min)}, median ${money(summary.median)}, highest ${money(summary.max)}.`}
          />
          <p className="mt-1 text-[13px] text-ink-3">
            The curve is smoother where more people are paid near the same amount. Each tick on the baseline is one person.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat label="Median" value={<Money value={summary.median} short />} />
            <Stat label="Average" value={<Money value={summary.mean} short />} />
            <Stat
              label="Middle half"
              value={
                <>
                  <Money value={summary.q1} short />
                  {' to '}
                  <Money value={summary.q3} short />
                </>
              }
              sub="25th to 75th percentile"
            />
            <Stat
              label="Full range"
              value={
                <>
                  <Money value={summary.min} short />
                  {' to '}
                  <Money value={summary.max} short />
                </>
              }
              sub={plural(summary.n, 'person', 'people')}
            />
          </div>
        </>
      )}
    </Panel>
  )
}
