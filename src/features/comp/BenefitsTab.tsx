// Benefits (#comp.benefits): what the group health plan costs and who it covers. Enrollment and plan details
// stay with the PEO or broker (docs/SPEC.md); this tab keeps the cost, the plan's start date and the summary link.
import { useMemo } from 'react'
import { links } from '@/app/router'
import { benefitsBasis, BENEFITS_MIN_HOURS, runRate } from '@/domain/pay'
import { fmtDate, today } from '@/lib/dates'
import { plural } from '@/lib/format'
import { useDB } from '@/store/db'
import { Money, Panel, Stat, TextLink } from '@/ui'

export function BenefitsTab() {
  const db = useDB((s) => s.db)
  const date = today()
  const rr = useMemo(() => runRate(db, date, { include: 'now' }), [db, date])
  const basis = benefitsBasis(db.company)
  const perHead = db.company.costModel.benefitsPerHeadMonthly
  const people = rr.lines.filter((l) => l.kind === 'employee')
  const covered = people.filter((l) => l.cost.benefits > 0).length
  const summaryUrl = db.company.linkOuts?.benefits
  const planStart = db.company.groupHealthPlanStartedOn

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Benefits cost"
        subtitle={`Employer share of medical, dental and vision for people working ${BENEFITS_MIN_HOURS}+ hours a week. A planning figure, not payroll.`}
      >
        {basis === 'none' ? (
          <p className="text-[14.5px] text-ink-2">
            Settings records that the company has no group health plan, so benefits count as $0 in Cost and runway. Change it under{' '}
            <TextLink href={links.settings('company')}>Settings, Company</TextLink>.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat label="Cost a month" value={<Money value={rr.breakdown.benefits} />} sub={basis === 'assumed' ? 'An assumption: no health plan recorded' : undefined} />
            <Stat label="Per person a month" value={<Money value={perHead} />} sub="Employer share" />
            <Stat label="People covered" value={covered} sub={`of ${plural(people.length, 'person', 'people')} on payroll`} />
            <Stat label="Plan started" value={planStart ? fmtDate(planStart) : 'Not recorded'} sub={planStart ? undefined : 'Add it in Settings, Company'} />
          </div>
        )}
      </Panel>

      <Panel title="Plan details" subtitle="Your PEO or broker runs enrollment and the plans themselves. This app keeps the link and the cost.">
        {summaryUrl ? (
          <p className="text-[14.5px] text-ink-2">
            The benefits summary is shared on job postings and in onboarding.{' '}
            <a href={summaryUrl} target="_blank" rel="noreferrer" className="ft-link font-semibold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
              Open benefits summary
            </a>
            . Change it under <TextLink href={links.settings('links')}>Settings, Link-outs</TextLink>.
          </p>
        ) : (
          <p className="text-[14.5px] text-ink-2">
            No benefits summary link yet. Add one under <TextLink href={links.settings('links')}>Settings, Link-outs</TextLink> and it appears on job postings and in onboarding.
          </p>
        )}
      </Panel>
    </div>
  )
}
