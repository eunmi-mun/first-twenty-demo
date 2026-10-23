// Length of stay: how long people have been here (or were, for those who left), as a density curve in months.
import { useMemo } from 'react'
import { fmtStay, fmtStayShort, staysOn } from '@/domain/turnover'
import { quantile, summarize, wageDensity } from '@/domain/wageStats'
import { today } from '@/lib/dates'
import { plural } from '@/lib/format'
import { useDB } from '@/store/db'
import { DensityChart, EmptyState, Panel, Stat } from '@/ui'

export function StayTab() {
  const db = useDB((s) => s.db)
  const t = today()
  const data = useMemo(() => {
    const stays = staysOn(db, t)
    const all = stays.map((s) => s.months).sort((a, b) => a - b)
    const here = stays.filter((s) => !s.left).map((s) => s.months).sort((a, b) => a - b)
    const left = stays.filter((s) => s.left).map((s) => s.months).sort((a, b) => a - b)
    return { all, here, left, summary: summarize(all), curve: wageDensity(all) }
  }, [db, t])
  const { all, here, left, summary, curve } = data

  return (
    <Panel
      title="Length of stay"
      subtitle={`Months from start date to today, or to the last day for people who left. ${plural(all.length, 'person', 'people')}, everyone who has started.`}
    >
      {all.length < 2 ? (
        <EmptyState compact icon="chart" title="Not enough people yet" body="The curve needs at least two people who have started. Add people under People and it fills in." />
      ) : (
        <>
          <DensityChart
            points={curve.points}
            values={here}
            markedValues={left}
            median={summary.median}
            format={fmtStayShort}
            tickUnit={1}
            ariaLabel={`Density of length of stay for ${plural(all.length, 'person', 'people')}: shortest ${fmtStay(summary.min)}, median ${fmtStay(summary.median)}, longest ${fmtStay(summary.max)}. ${plural(left.length, 'person', 'people')} left.`}
          />
          <p className="mt-1 text-[13px] text-ink-3">
            A short tick is someone still here; a tall dark tick is someone who left. The curve is smoother where more stays are about the same length.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat label="Median stay" value={fmtStay(summary.median)} sub={`Average ${fmtStay(summary.mean)}`} />
            <Stat label="Longest" value={fmtStay(summary.max)} sub={`Shortest ${fmtStay(summary.min)}`} />
            <Stat
              label="Still here"
              value={plural(here.length, 'person', 'people')}
              sub={here.length ? `Median ${fmtStay(quantile(here, 0.5))}` : undefined}
            />
            <Stat
              label="Left"
              value={plural(left.length, 'person', 'people')}
              sub={left.length ? `Median stay ${fmtStay(quantile(left, 0.5))}` : 'No one has left yet'}
            />
          </div>
        </>
      )}
    </Panel>
  )
}
