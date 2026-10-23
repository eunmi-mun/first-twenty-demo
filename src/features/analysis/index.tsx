// HR analysis (#analysis[.wages|.tenure|.turnover], admin): statistics drawn from the employees' own records.
// The numbers live in src/domain (wageStats.ts, turnover.ts); this folder only lays them out.
import { links } from '@/app/router'
import type { PageProps } from '@/app/routes'
import { useViewer } from '@/app/useViewer'
import { EmptyState, PageHeader, type TabDef, Tabs } from '@/ui'
import { StayTab } from './StayTab'
import { TurnoverTab } from './TurnoverTab'
import { WagesTab } from './WagesTab'

type TabKey = 'wages' | 'tenure' | 'turnover'
const TAB_KEYS: TabKey[] = ['wages', 'tenure', 'turnover']

const SUBTITLES: Record<TabKey, string> = {
  wages: "How pay is spread across the team. Press B to blur amounts when sharing your screen.",
  tenure: 'How long people stay, including those who left.',
  turnover: 'Who left, how often, and how they left.',
}

export function AnalysisPage({ route }: PageProps) {
  const viewer = useViewer()
  const seg = route.segments[1] as TabKey | undefined
  const tab: TabKey = seg && TAB_KEYS.includes(seg) ? seg : 'wages'
  if (viewer.role !== 'admin') {
    return (
      <>
        <PageHeader title="HR analysis" />
        <EmptyState icon="lock" title="Admins only" body="HR analysis shows everyone's pay and who left, so only the Admin view opens it. This is a preview, not security." />
      </>
    )
  }
  const tabs: Array<TabDef<TabKey>> = [
    { key: 'wages', label: 'Wages', href: links.analysis('wages') },
    { key: 'tenure', label: 'Length of stay', href: links.analysis('tenure') },
    { key: 'turnover', label: 'Turnover', href: links.analysis('turnover') },
  ]
  return (
    <>
      <PageHeader title="HR analysis" subtitle={SUBTITLES[tab]} />
      <Tabs<TabKey> tabs={tabs} value={tab} label="HR analysis sections" className="mb-5" />
      {tab === 'wages' && <WagesTab />}
      {tab === 'tenure' && <StayTab />}
      {tab === 'turnover' && <TurnoverTab />}
    </>
  )
}
