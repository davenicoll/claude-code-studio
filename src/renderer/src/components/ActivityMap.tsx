import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { getInitials } from '../lib/status'
import type { Agent, AgentStatus, Team } from '@shared/types'

interface ActivityMapProps {
  teams: Team[]
  onAgentClick: (id: string) => void
}

// ---------------------------------------------------------
// CYBER/HUD THEME DEFINITIONS
// ---------------------------------------------------------
const cyberPalette = {
  bg: '#020617', // Extremely dark slate
  cyan: '#00f3ff', // Neon Cyan
  green: '#39ff14', // Matrix Green
  emerald: '#10b981', // Softer green
  amber: '#fbbf24', // Warning Yellow/Orange
  orange: '#f97316',
  red: '#ff003c', // Cyberpunk Red
  purple: '#8b5cf6', // Magenta/Purple
  gray: '#475569',
  darkGray: '#1e293b',
  grid: '#0f172a', // Grid lines
  textMain: '#e2e8f0',
  textMuted: '#94a3b8'
}

type CyberStyle = { color: string; glow: string; label: string }

const statusTheme: Record<AgentStatus, CyberStyle> = {
  creating: { color: cyberPalette.gray, glow: 'rgba(71,85,105,0.5)', label: 'INIT' },
  active: { color: cyberPalette.green, glow: 'rgba(57,255,20,0.6)', label: 'ACTIVE' },
  thinking: { color: cyberPalette.cyan, glow: 'rgba(0,243,255,0.7)', label: 'COMPUTING' },
  tool_running: { color: cyberPalette.amber, glow: 'rgba(251,191,36,0.6)', label: 'EXEC' },
  awaiting: { color: cyberPalette.orange, glow: 'rgba(249,115,22,0.6)', label: 'AWAIT' },
  error: { color: cyberPalette.red, glow: 'rgba(255,0,60,0.8)', label: 'ERR: CRITICAL' },
  session_conflict: { color: cyberPalette.purple, glow: 'rgba(139,92,246,0.6)', label: 'CONFLICT' },
  idle: { color: cyberPalette.gray, glow: 'transparent', label: 'STANDBY' },
  archived: { color: cyberPalette.darkGray, glow: 'transparent', label: 'OFFLINE' }
}

// Helper: Calculate positions around a center
function getRadialPosition(index: number, total: number, centerX: number, centerY: number, radius: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  }
}

function groupByTeam(agents: Agent[], teams: Team[]) {
  const groups: { team: Team | null; agents: Agent[] }[] = teams.map((t) => ({ team: t, agents: agents.filter((a) => a.teamId === t.id) }))
  const unassigned = agents.filter((a) => !a.teamId)
  if (unassigned.length > 0) groups.push({ team: null, agents: unassigned })
  return groups.filter((g) => g.agents.length > 0)
}

// ---------------------------------------------------------
// HUD DATA STREAMS (Random decorative text)
// ---------------------------------------------------------
const HUDDataStream = ({ x, y }: { x: number; y: number }) => {
  const [data, setData] = useState<string[]>([])

  useEffect(() => {
    const generateStr = () =>
      Array.from({ length: 6 })
        .map(() => Math.floor(Math.random() * 16).toString(16).toUpperCase())
        .join('')
    setData(Array.from({ length: 5 }).map(() => `0x${generateStr()}`))

    const interval = setInterval(() => {
      setData((prev) => [...prev.slice(1), `0x${generateStr()}`])
    }, 1500 + Math.random() * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <g transform={`translate(${x}, ${y})`} fill={cyberPalette.cyan} opacity={0.4} className="font-mono text-[8px]" style={{ userSelect: 'none' }}>
      {data.map((str, i) => (
        <text key={i} y={i * 12}>{str}</text>
      ))}
    </g>
  )
}

// ---------------------------------------------------------
// AGENT NODE (TARGET HUD)
// ---------------------------------------------------------
function AgentNode({ agent, x, y, onClick }: { agent: Agent; x: number; y: number; onClick: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const theme = statusTheme[agent.status]
  const isActive = ['active', 'thinking', 'tool_running', 'awaiting'].includes(agent.status)
  const isDanger = agent.status === 'error'
  
  const coreRadius = 14
  
  return (
    <g
      className="cursor-pointer"
      onClick={() => onClick(agent.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ターゲットロックオンのクロスヘア */}
      <path
        d={`M ${x - 22} ${y - 22} L ${x - 16} ${y - 22}
            M ${x - 22} ${y - 22} L ${x - 22} ${y - 16}
            M ${x + 22} ${y - 22} L ${x + 16} ${y - 22}
            M ${x + 22} ${y - 22} L ${x + 22} ${y - 16}
            M ${x - 22} ${y + 22} L ${x - 16} ${y + 22}
            M ${x - 22} ${y + 22} L ${x - 22} ${y + 16}
            M ${x + 22} ${y + 22} L ${x + 16} ${y + 22}
            M ${x + 22} ${y + 22} L ${x + 22} ${y + 16}`}
        stroke={hovered ? cyberPalette.cyan : theme.color}
        strokeWidth={1}
        fill="none"
        opacity={hovered ? 1 : 0.5}
      />

      {/* 外側の回転リング (アクティブ時のみ) */}
      {isActive && (
        <g>
          <circle cx={x} cy={y} r={18} fill="none" stroke={theme.color} strokeWidth={1} strokeDasharray="4 8" opacity={0.8}>
            <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="6s" repeatCount="indefinite" />
          </circle>
          {agent.status === 'thinking' && (
            <circle cx={x} cy={y} r={24} fill="none" stroke={theme.color} strokeWidth={0.5} strokeDasharray="20 40 10 10">
              <animateTransform attributeName="transform" type="rotate" from={`360 ${x} ${y}`} to={`0 ${x} ${y}`} dur="3s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      )}

      {/* エラー時の警告リップル */}
      {isDanger && (
        <circle cx={x} cy={y} r={18} fill="none" stroke={theme.color} strokeWidth={2}>
          <animate attributeName="r" values="14; 28" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1; 0" dur="1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* コアサークル */}
      <circle
        cx={x}
        cy={y}
        r={coreRadius}
        fill={cyberPalette.bg}
        stroke={theme.color}
        strokeWidth={2}
        filter={isDanger || isActive ? 'url(#cyber-glow)' : ''}
      />
      {/* 内部コア */}
      <circle cx={x} cy={y} r={4} fill={theme.color} className={isActive ? 'animate-pulse' : ''} />

      {/* テキスト - ブラケット付き Initials */}
      <text x={x} y={y - 25} textAnchor="middle" className="font-mono text-[9px] font-bold tracking-widest" fill={theme.color} opacity={0.9} style={{ userSelect: 'none' }}>
        [{getInitials(agent.name)}]
      </text>

      {/* エージェント名 */}
      <text x={x} y={y + 32} textAnchor="middle" className="font-mono text-[8px] uppercase tracking-wider" fill={cyberPalette.textMain} style={{ userSelect: 'none' }}>
        {agent.name.length > 10 ? agent.name.slice(0, 9) + '..' : agent.name}
      </text>

      {/* ステータスバッジ */}
      <rect x={x - 25} y={y + 40} width={50} height={12} fill={theme.color} opacity={0.15} />
      <text x={x} y={y + 49} textAnchor="middle" className="font-mono text-[7px] font-bold uppercase tracking-widest" fill={theme.color} style={{ userSelect: 'none' }}>
        {theme.label}
      </text>

      {/* Hover Info Panel (Holographic Tooltip) */}
      {hovered && (
        <foreignObject x={x + 30} y={y - 50} width={200} height={130} style={{ overflow: 'visible', zIndex: 100 }}>
          <div
            className="border shadow-2xl relative"
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.85)',
              borderColor: theme.color,
              boxShadow: `0 0 20px ${theme.glow}`,
              backdropFilter: 'blur(4px)',
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '10px',
              color: cyberPalette.textMain
            }}
          >
            {/* Corner tech lines */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: theme.color }} />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: theme.color }} />
            
            <div style={{ color: theme.color, fontWeight: 'bold', fontSize: '13px', borderBottom: `1px solid ${theme.color}40`, paddingBottom: '4px', marginBottom: '8px' }}>
              &gt; {agent.name.toUpperCase()}
            </div>
            
            <div className="flex justify-between mb-1 opacity-80">
              <span className="text-cyan-500">STS:</span>
              <span style={{ color: theme.color }}>{agent.status.toUpperCase()}</span>
            </div>
            {agent.workspaceId && (
              <div className="flex justify-between mb-1 opacity-80">
                <span className="text-cyan-500">WRK:</span>
                <span className="truncate ml-2">{agent.workspaceId.split('/').pop()?.slice(0, 16)}</span>
              </div>
            )}
            {agent.currentTask && (
              <div className="mt-2 text-[9px] leading-tight" style={{ color: cyberPalette.textMuted }}>
                <div className="text-cyan-600 mb-[2px]">TGT.TASK/</div>
                <div className="break-all">{agent.currentTask.slice(0, 60)}{agent.currentTask.length > 60 ? '...' : ''}</div>
              </div>
            )}
            <div className="absolute bottom-1 right-2 text-[7px] text-gray-600">
              [ {new Date(agent.updatedAt).toLocaleTimeString()} ]
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
}

// ---------------------------------------------------------
// CONNECTION LINES (DATA STREAMS)
// ---------------------------------------------------------
function DataStreams({ agents, positions }: { agents: Agent[]; positions: Map<string, { x: number; y: number }> }) {
  const lines: { from: { x: number; y: number }; to: { x: number; y: number }; theme: CyberStyle }[] = []

  for (const agent of agents) {
    if (!agent.reportTo) continue
    const fromPos = positions.get(agent.id)
    const toPos = positions.get(agent.reportTo)
    const theme = statusTheme[agent.status]
    if (fromPos && toPos) lines.push({ from: fromPos, to: toPos, theme })
  }

  return (
    <g>
      {lines.map((line, i) => {
        const isActive = line.theme.color === cyberPalette.cyan || line.theme.color === cyberPalette.green || line.theme.color === cyberPalette.amber
        return (
          <g key={i}>
            {/* Base line */}
            <line
              x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y}
              stroke={line.theme.color} strokeWidth={1} opacity={0.3}
            />
            {/* Animated data packets */}
            {isActive && (
              <g>
                <circle r={2} fill={line.theme.color} filter="url(#cyber-glow)">
                  <animateMotion dur={`${0.8 + Math.random() * 1}s`} repeatCount="indefinite" path={`M${line.from.x},${line.from.y} L${line.to.x},${line.to.y}`} />
                </circle>
                <line
                  x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y}
                  stroke={line.theme.color} strokeWidth={2} strokeDasharray="10 20" opacity={0.6}
                >
                  <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
                </line>
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ---------------------------------------------------------
// CENTRAL SYSTEM HUB (MAGI / STARK CORE)
// ---------------------------------------------------------
function SystemCore({ cx, cy, stats }: { cx: number; cy: number; stats: { total: number; active: number; error: number } }) {
  const isDanger = stats.error > 0
  const coreColor = isDanger ? cyberPalette.red : cyberPalette.cyan
  
  return (
    <g>
      {/* MAGI-style background Hexagon */}
      <polygon
        points={`${cx},${cy-60} ${cx+52},${cy-30} ${cx+52},${cy+30} ${cx},${cy+60} ${cx-52},${cy+30} ${cx-52},${cy-30}`}
        fill={cyberPalette.bg}
        stroke={coreColor}
        strokeWidth={1}
        opacity={0.8}
        filter="url(#cyber-glow)"
      />

      {/* Rotating complex rings */}
      <circle cx={cx} cy={cy} r={75} fill="none" stroke={coreColor} strokeWidth={1} strokeDasharray="2 10 20 10" opacity={0.5}>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="20s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={85} fill="none" stroke={coreColor} strokeWidth={0.5} strokeDasharray="100 10 40 10">
        <animateTransform attributeName="transform" type="rotate" from={`360 ${cx} ${cy}`} to={`0 ${cx} ${cy}`} dur="30s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={95} fill="none" stroke={cyberPalette.textMuted} strokeWidth={0.5} strokeDasharray="5 5 1 5" opacity={0.3}>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="40s" repeatCount="indefinite" />
      </circle>

      {/* Crosshairs inside hex */}
      <line x1={cx - 50} y1={cy} x2={cx + 50} y2={cy} stroke={coreColor} strokeWidth={0.5} opacity={0.4} />
      <line x1={cx} y1={cy - 50} x2={cx} y2={cy + 50} stroke={coreColor} strokeWidth={0.5} opacity={0.4} />

      {/* Core Text Elements */}
      <text x={cx} y={cy - 20} textAnchor="middle" className="font-mono font-bold tracking-[0.2em] text-[18px]" fill={coreColor} style={{ userSelect: 'none' }} filter="url(#cyber-glow)">
        SYSTEM
      </text>
      <text x={cx} y={cy - 2} textAnchor="middle" className="font-mono text-[6px] tracking-widest uppercase" fill={cyberPalette.textMain} style={{ userSelect: 'none' }}>
        CORE ORCHESTRATOR
      </text>

      {/* Health / Error display */}
      <rect x={cx - 30} y={cy + 8} width={60} height={16} fill={coreColor} opacity={0.15} />
      <text x={cx} y={cy + 20} textAnchor="middle" className="font-mono text-[10px] uppercase font-bold tracking-widest" fill={isDanger ? cyberPalette.red : cyberPalette.green} style={{ userSelect: 'none' }}>
        {isDanger ? 'SYS: ERR' : 'SYS: OK'}
      </text>

      {/* Online Stats */}
      <text x={cx} y={cy + 38} textAnchor="middle" className="font-mono text-[8px]" fill={cyberPalette.textMuted} style={{ userSelect: 'none' }}>
        NODES: {stats.active}/{stats.total}
      </text>
    </g>
  )
}

// ---------------------------------------------------------
// SECTOR LABELS
// ---------------------------------------------------------
type CyberSectorLabelProps = {
  team: Team | null;
  startAngle: number;
  endAngle: number;
  cx: number;
  cy: number;
  radius: number;
}
function CyberSectorLabel({ team, startAngle, endAngle, cx, cy, radius }: CyberSectorLabelProps) {
  const midAngle = (startAngle + endAngle) / 2
  const textRadius = radius + 40
  const x = cx + textRadius * Math.cos(midAngle)
  const y = cy + textRadius * Math.sin(midAngle)

  const arcRadius = radius + 20
  const startX = cx + arcRadius * Math.cos(startAngle)
  const startY = cy + arcRadius * Math.sin(startAngle)
  const endX = cx + arcRadius * Math.cos(endAngle)
  const endY = cy + arcRadius * Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  
  const arcLen = endAngle - startAngle
  const isTiny = arcLen < 0.2

  if (isTiny) return null

  return (
    <g>
      <path
        d={`M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${endX} ${endY}`}
        fill="none"
        stroke={team?.color || cyberPalette.gray}
        strokeWidth={2}
        opacity={0.5}
        strokeDasharray="4 4"
      />
      <rect x={x - 40} y={y - 8} width={80} height={16} fill={cyberPalette.bg} stroke={team?.color || cyberPalette.gray} strokeWidth={0.5} opacity={0.9} />
      <text x={x} y={y + 3} textAnchor="middle" className="font-mono text-[8px] uppercase tracking-wider" fill={team?.color || cyberPalette.textMain} style={{ userSelect: 'none' }}>
        SEC: {team?.name || 'UNASSIGNED'}
      </text>
    </g>
  )
}

// ---------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------
export function ActivityMap({ teams, onAgentClick }: ActivityMapProps) {
  const { t } = useTranslation()
  const { agents } = useAppStore()
  const activeAgents = agents.filter((a) => a.status !== 'archived')

  // Expanded HUD Canvas
  const svgWidth = 800
  const svgHeight = 500
  const centerX = svgWidth / 2
  const centerY = svgHeight / 2

  const { positions, teamSectors } = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    const sectors: { team: Team | null; startAngle: number; endAngle: number }[] = []
    if (activeAgents.length === 0) return { positions: pos, teamSectors: sectors }

    const groups = groupByTeam(activeAgents, teams)
    const totalAgents = activeAgents.length
    // Agent orbit radius
    const radius = 160 

    let currentIndex = 0
    for (const group of groups) {
      const startAngle = (2 * Math.PI * currentIndex) / totalAgents - Math.PI / 2
      for (let i = 0; i < group.agents.length; i++) {
        const position = getRadialPosition(currentIndex + i, totalAgents, centerX, centerY, radius)
        pos.set(group.agents[i].id, position)
      }
      const endAngle = (2 * Math.PI * (currentIndex + group.agents.length)) / totalAgents - Math.PI / 2
      sectors.push({ team: group.team, startAngle, endAngle })
      currentIndex += group.agents.length
    }
    return { positions: pos, teamSectors: sectors }
  }, [activeAgents, teams, centerX, centerY])

  const stats = useMemo(() => {
    const total = activeAgents.length
    const active = activeAgents.filter((a) => ['active', 'thinking', 'tool_running', 'awaiting'].includes(a.status)).length
    const error = activeAgents.filter((a) => a.status === 'error').length
    return { total, active, error }
  }, [activeAgents])

  if (activeAgents.length === 0) {
    return (
      <div className="w-full flex items-center justify-center aspect-video bg-[#020617] border border-cyan-900 overflow-hidden font-mono relative">
         <div className="text-cyan-500 text-sm tracking-widest opacity-50 flex flex-col items-center">
            <span className="mb-2 uppercase">[ {t('agent.noAgents')} ]</span>
            <span className="animate-pulse">AWAITING SYSTEM INITIALIZATION...</span>
         </div>
      </div>
    )
  }

  return (
    <div 
      className="relative w-full rounded-md border shadow-2xl overflow-hidden select-none"
      style={{
        backgroundColor: cyberPalette.bg,
        borderColor: 'rgba(6, 182, 212, 0.3)',
        aspectRatio: '16/10'
      }}
    >
      {/* Overlays / Radar FX */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)`,
          backgroundSize: '100% 4px',
          zIndex: 10
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-cyan-900/10 via-transparent to-transparent z-10 block" />

      {/* SVG Container */}
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full block">
        <defs>
          <filter id="cyber-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={cyberPalette.grid} strokeWidth="1" />
            {/* Crosshairs at grid intersections */}
            <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke={cyberPalette.cyan} strokeWidth="0.5" opacity="0.3" transform="translate(0,0)" />
          </pattern>
        </defs>

        {/* Background Layer */}
        <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />
        
        {/* Background Radar Spin */}
        <g stroke={cyberPalette.cyan} strokeWidth={0.5} opacity={0.15}>
          <line x1={centerX - 400} y1={centerY} x2={centerX + 400} y2={centerY} />
          <line x1={centerX} y1={centerY - 300} x2={centerX} y2={centerY + 300} />
        </g>
        <path d={`M ${centerX} ${centerY} L ${centerX + 300} ${centerY - 100} L ${centerX + 300} ${centerY + 100} Z`} fill="url(#cyber-glow)" opacity={0.02} fillRule="evenodd">
           <animateTransform attributeName="transform" type="rotate" from={`0 ${centerX} ${centerY}`} to={`360 ${centerX} ${centerY}`} dur="10s" repeatCount="indefinite" />
        </path>

        {/* Outer Ring boundary */}
        <circle cx={centerX} cy={centerY} r={280} fill="none" stroke={cyberPalette.cyan} strokeWidth={1} opacity={0.1} strokeDasharray="50 15" />

        {/* Structural Elements */}
        {teamSectors.map((s, i) => (
          <CyberSectorLabel key={i} {...s} cx={centerX} cy={centerY} radius={185} />
        ))}

        {/* Lines */}
        <DataStreams agents={activeAgents} positions={positions} />

        {/* Core */}
        <SystemCore cx={centerX} cy={centerY} stats={stats} />

        {/* Nodes */}
        {activeAgents.map((agent) => {
          const pos = positions.get(agent.id)
          if (!pos) return null
          return <AgentNode key={agent.id} agent={agent} x={pos.x} y={pos.y} onClick={onAgentClick} />
        })}

        {/* Corner Decorators */}
        <g opacity={0.5}>
          <path d="M 20 60 L 20 20 L 60 20" fill="none" stroke={cyberPalette.cyan} strokeWidth={3} />
          <path d="M 780 60 L 780 20 L 740 20" fill="none" stroke={cyberPalette.cyan} strokeWidth={3} />
          <path d="M 20 440 L 20 480 L 60 480" fill="none" stroke={cyberPalette.cyan} strokeWidth={3} />
          <path d="M 780 440 L 780 480 L 740 480" fill="none" stroke={cyberPalette.cyan} strokeWidth={3} />
          
          <rect x={25} y={65} width={4} height={20} fill={cyberPalette.cyan} />
          <rect x={25} y={90} width={4} height={10} fill={cyberPalette.cyan} />
          <rect x={771} y={65} width={4} height={40} fill={cyberPalette.cyan} opacity={0.5} />
        </g>

        {/* Data Streams Overlay */}
        <HUDDataStream x={40} y={150} />
        <HUDDataStream x={730} y={350} />
        
        {/* Footer info */}
        <text x={centerX} y={svgHeight - 20} textAnchor="middle" className="font-mono text-[8px] uppercase tracking-[0.3em] fill-cyan-700/60" style={{ userSelect: 'none' }}>
           CLAUDE-AGENTDECK :: NEURAL LINK ESTABLISHED :: TERMINAL ACTIVE
        </text>
      </svg>
    </div>
  )
}
