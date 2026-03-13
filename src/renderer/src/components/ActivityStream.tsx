import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, Zap, CheckCircle, AlertCircle, Clock, TerminalSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'

interface ActivityEvent {
  id: number
  agentId: string
  agentName: string
  type: 'tool_use' | 'thinking' | 'complete' | 'error' | 'output'
  content: string
  timestamp: Date
}

const MAX_EVENTS = 200
let eventIdCounter = 0

const TYPE_STYLES: Record<string, { icon: typeof Zap; color: string; glow: string }> = {
  tool_use: { icon: Zap, color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  thinking: { icon: Clock, color: 'text-purple-400', glow: 'shadow-purple-500/20' },
  complete: { icon: CheckCircle, color: 'text-green-400', glow: 'shadow-green-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', glow: 'shadow-red-500/20' },
  output: { icon: TerminalSquare, color: 'text-blue-400', glow: 'shadow-blue-500/20' }
}

export function ActivityStream({ className }: { className?: string }): JSX.Element {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const agents = useAppStore((s) => s.agents)

  // Parse PTY output into activity events
  useEffect(() => {
    const unsub = window.api.onAgentOutput((agentId, message) => {
      const agent = agents.find((a) => a.id === agentId)
      const name = agent?.name ?? agentId.slice(0, 8)

      let type: ActivityEvent['type'] = 'output'
      let content = ''

      if (message.contentType === 'tool_exec') {
        type = 'tool_use'
        content = message.content.slice(0, 120)
      } else if (message.contentType === 'code') {
        type = 'complete'
        content = message.content.slice(0, 80)
      } else if (message.role === 'agent' && message.contentType === 'text') {
        type = 'thinking'
        content = message.content.slice(0, 80)
      } else if (message.contentType === 'error') {
        type = 'error'
        content = message.content.slice(0, 100)
      } else if (message.contentType === 'text') {
        content = message.content.slice(0, 100)
      }

      if (!content.trim()) return

      const evt: ActivityEvent = {
        id: ++eventIdCounter,
        agentId,
        agentName: name,
        type,
        content: content.replace(/\n/g, ' ').trim(),
        timestamp: new Date()
      }

      setEvents((prev) => {
        const next = [...prev, evt]
        if (next.length > MAX_EVENTS) next.splice(0, next.length - MAX_EVENTS)
        return next
      })
    })

    return unsub
  }, [agents])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events, autoScroll])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }, [])

  const formatTime = (d: Date): string => {
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <Activity size={14} className="text-primary animate-pulse" />
        <span className="text-xs font-medium">Activity Stream</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {events.length} events
        </span>
        <div className={cn(
          'w-1.5 h-1.5 rounded-full',
          events.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/30'
        )} />
      </div>

      {/* Stream */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
            <Activity size={24} className="mb-2" />
            <span className="text-xs">Waiting for agent activity...</span>
          </div>
        ) : (
          <div className="p-1">
            {events.map((evt) => {
              const style = TYPE_STYLES[evt.type] ?? TYPE_STYLES.output
              const Icon = style.icon
              return (
                <div
                  key={evt.id}
                  className={cn(
                    'flex items-start gap-2 px-2 py-1 rounded text-[11px] transition-colors hover:bg-muted/30',
                    'animate-in fade-in slide-in-from-left-2 duration-200'
                  )}
                >
                  <span className="text-[9px] text-muted-foreground/50 font-mono shrink-0 mt-0.5 w-[52px]">
                    {formatTime(evt.timestamp)}
                  </span>
                  <Icon size={11} className={cn(style.color, 'shrink-0 mt-0.5')} />
                  <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-[60px] truncate">
                    {evt.agentName}
                  </span>
                  <span className="text-muted-foreground/80 truncate min-w-0 font-mono">
                    {evt.content}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scanline effect (SF aesthetic) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/[0.02]" />
    </div>
  )
}
