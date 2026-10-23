// HR analysis (#analysis, admin): statistics drawn from the employees' own records. First panel: the wage
// distribution. Pure numbers live in src/domain/wageStats.ts; this folder only lays them out.
import { useMemo } from 'react'
import type { PageProps } from '@/app/routes'
import { useViewer } from '@/app/useViewer'
import { summarize, wageDensity, wagesOn } from '@/domain/wageStats'
import { today } from '@/lib/dates'
import { money, moneyShort, plural } from '@/lib/format'
import { useDB } from '@/store/db'
import { DensityChart, EmptyState, Money, PageHeader, Panel, Stat } from '@/ui'

export function AnalysisPage(_props: PageProps) {
  const viewer = useViewer()
  if (viewer.role !== 'admin') {
    return (
      <>
        <PageHeader title="HR analysis" />
        <EmptyState icon="lock" title="Admins only" body="HR analysis shows everyone's pay, so only the Admin view opens it. This is a preview, not security." />
      </>
    )
  }
  return (
    <>
      <PageHeader title="HR analysis" subtitle="Statistics from your people's records. Press B to blur amounts when sharing your screen." />
      <WageDistribution />
    </>
  )
}

function WageDistribution() {
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
