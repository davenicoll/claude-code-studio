import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { cn } from '../lib/utils'
import { getStatusDot, getStatusBadge, getInitials } from '../lib/status'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import type { Agent, AgentStatus, Team } from '@shared/types'

interface KanbanBoardProps {
  teams: Team[]
  onAgentClick: (id: string) => void
}

const kanbanColumns: { status: AgentStatus; color: string }[] = [
  { status: 'active', color: 'border-green-500' },
  { status: 'thinking', color: 'border-blue-500' },
  { status: 'tool_running', color: 'border-yellow-500' },
  { status: 'awaiting', color: 'border-orange-500' },
  { status: 'idle', color: 'border-gray-400' },
  { status: 'error', color: 'border-red-500' }
]

function SortableAgentCard({ agent, onAgentClick }: { agent: Agent; onAgentClick: (id: string) => void }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: agent.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <AgentKanbanCard agent={agent} onAgentClick={onAgentClick} />
    </div>
  )
}

function AgentKanbanCard({ agent, onAgentClick }: { agent: Agent; onAgentClick: (id: string) => void }): JSX.Element {
  return (
    <button
      onClick={() => onAgentClick(agent.id)}
      className="w-full text-left p-2.5 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors mb-1.5"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
            {getInitials(agent.name)}
          </div>
          <div className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card', getStatusDot(agent.status))} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{agent.name}</div>
          {agent.roleLabel && (
            <div className="text-[10px] text-muted-foreground">{agent.roleLabel}</div>
          )}
        </div>
      </div>
      {agent.currentTask && (
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate pl-10">
          {agent.currentTask}
        </p>
      )}
      {agent.skills.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1.5 pl-10">
          {agent.skills.slice(0, 2).map((skill) => (
            <span key={skill} className="text-[8px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">
              {skill}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

export function KanbanBoard({ onAgentClick }: KanbanBoardProps): JSX.Element {
  const { t } = useTranslation()
  const { agents, updateAgentInList } = useAppStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeAgents = agents.filter((a) => a.status !== 'archived' && a.status !== 'creating')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const agentId = active.id as string
    const targetColumn = over.id as string

    // Check if dropped on a column header
    if (kanbanColumns.some((c) => c.status === targetColumn)) {
      const agent = activeAgents.find((a) => a.id === agentId)
      if (agent && agent.status !== targetColumn) {
        // Only allow moving to idle (done) or restart flows in real usage
        // For now, just update the visual state
        window.api.updateAgent(agentId, { status: targetColumn as AgentStatus })
        updateAgentInList(agentId, { status: targetColumn as AgentStatus })
      }
    }
  }

  const draggedAgent = activeId ? activeAgents.find((a) => a.id === activeId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {kanbanColumns.map(({ status, color }) => {
          const columnAgents = activeAgents.filter((a) => a.status === status)

          return (
            <div
              key={status}
              id={status}
              className={cn('flex-shrink-0 w-52 rounded-lg bg-secondary/50 border-t-2', color)}
            >
              <div className="p-2 flex items-center justify-between">
                <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded', getStatusBadge(status))}>
                  {t(`agent.status.${status}`)}
                </span>
                <span className="text-[10px] text-muted-foreground">{columnAgents.length}</span>
              </div>
              <div className="p-1.5 min-h-[80px]">
                <SortableContext items={columnAgents.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  {columnAgents.map((agent) => (
                    <SortableAgentCard key={agent.id} agent={agent} onAgentClick={onAgentClick} />
                  ))}
                </SortableContext>
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {draggedAgent && <AgentKanbanCard agent={draggedAgent} onAgentClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  )
}
