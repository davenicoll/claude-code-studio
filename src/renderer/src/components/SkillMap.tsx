import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { cn } from '../lib/utils'
import { getStatusDot, getInitials } from '../lib/status'

interface SkillMapProps {
  onAgentClick: (id: string) => void
}

export function SkillMap({ onAgentClick }: SkillMapProps): JSX.Element {
  const { t } = useTranslation()
  const { agents } = useAppStore()
  const activeAgents = agents.filter((a) => a.status !== 'archived')

  // Build skill → agents mapping
  const skillGroups = useMemo(() => {
    const map = new Map<string, typeof activeAgents>()
    for (const agent of activeAgents) {
      for (const skill of agent.skills) {
        const normalized = skill.trim()
        if (!normalized) continue
        if (!map.has(normalized)) map.set(normalized, [])
        map.get(normalized)!.push(agent)
      }
    }
    // Sort by member count descending
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [activeAgents])

  const agentsWithoutSkills = activeAgents.filter((a) => a.skills.length === 0)

  if (activeAgents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        {t('agent.noAgents')}
      </div>
    )
  }

  if (skillGroups.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        {t('profile.skills')}: {t('teamMgmt.noMembers')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {skillGroups.map(([skill, members]) => (
        <div key={skill} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {skill}
            </span>
            <span className="text-[10px] text-muted-foreground">{members.length}</span>
            {/* Skill coverage bar */}
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/40 rounded-full"
                style={{ width: `${Math.min((members.length / activeAgents.length) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-1">
            {members.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onAgentClick(agent.id)}
                aria-label={`${agent.name} - ${agent.status}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                    {getInitials(agent.name)}
                  </div>
                  <div className={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card', getStatusDot(agent.status))} />
                </div>
                <span className="text-[11px]">{agent.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {agentsWithoutSkills.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground">{t('agent.skills')}: —</span>
          <div className="flex flex-wrap gap-1.5 pl-1">
            {agentsWithoutSkills.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onAgentClick(agent.id)}
                aria-label={`${agent.name} - no skills assigned`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border/50 hover:bg-accent/50 transition-colors opacity-60"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                  {getInitials(agent.name)}
                </div>
                <span className="text-[11px]">{agent.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
