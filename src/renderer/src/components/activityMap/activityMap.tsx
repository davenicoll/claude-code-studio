import type { Team } from '@shared/types'
import { useActivityMapState } from './useActivityMapState'
import { ActivityMapGrid } from './activityMapGrid'
import { CockpitOverlay } from './activityMapCockpit'

interface ActivityMapProps {
  teams: Team[]
  onAgentClick: (id: string) => void
}

export function ActivityMap({ teams, onAgentClick }: ActivityMapProps) {
  const state = useActivityMapState(teams)

  const {
    palette,
    statusTheme,
    agents,
    activeAgents,
    usePtyMode,
    agentMemory,
    activeChainFlows,
    resolveWorkspaceName,
    scale,
    pan,
    svgRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleZoomIn,
    handleZoomOut,
    handleZoomFit,
    centerX,
    centerY,
    positions,
    teamSectors,
    machineLabels,
    projectLabels,
    externalPositions,
    stats,
    activeExternalSessions,
    pulsingAgents,
    cockpitAgentId,
    setCockpitAgentId,
    terminalCollapsed,
    setTerminalCollapsed,
    cockpitProfile,
    isRenaming,
    setIsRenaming,
    renameValue,
    setRenameValue,
    renameInputRef,
    startRename,
    commitRename,
    handleAgentNodeClick
  } = state

  // Empty state
  if (activeAgents.length === 0 && activeExternalSessions.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center border overflow-hidden font-mono relative rounded-md" style={{ backgroundColor: palette.bg, borderColor: palette.cockpitBorder }}>
        <div className="text-sm tracking-widest opacity-50 flex flex-col items-center" style={{ color: palette.textMuted }}>
          <span className="mb-2 uppercase">[ NO AGENTS ONLINE ]</span>
          <span className="text-xs opacity-70">Create an agent to get started</span>
        </div>
      </div>
    )
  }

  const cockpitAgent = cockpitAgentId ? agents.find(a => a.id === cockpitAgentId) : null

  const cockpitOverlay = cockpitAgent ? (
    <CockpitOverlay
      agent={cockpitAgent}
      palette={palette}
      statusTheme={statusTheme}
      usePtyMode={usePtyMode}
      agentMemory={agentMemory}
      cockpitProfile={cockpitProfile}
      isRenaming={isRenaming}
      renameValue={renameValue}
      setRenameValue={setRenameValue}
      renameInputRef={renameInputRef}
      startRename={startRename}
      commitRename={commitRename}
      terminalCollapsed={terminalCollapsed}
      setTerminalCollapsed={setTerminalCollapsed}
      onOpenFullView={() => {
        onAgentClick(cockpitAgent.id)
        setCockpitAgentId(null)
      }}
      onClose={() => {
        setCockpitAgentId(null)
        setIsRenaming(false)
      }}
    />
  ) : null

  return (
    <div className="flex flex-col w-full h-full relative">
      <ActivityMapGrid
        palette={palette}
        statusTheme={statusTheme}
        svgRef={svgRef}
        scale={scale}
        pan={pan}
        centerX={centerX}
        centerY={centerY}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        teamSectors={teamSectors}
        machineLabels={machineLabels}
        projectLabels={projectLabels}
        positions={positions}
        externalPositions={externalPositions}
        activeAgents={activeAgents}
        activeExternalSessions={activeExternalSessions}
        activeChainFlows={activeChainFlows}
        pulsingAgents={pulsingAgents}
        stats={stats}
        agentMemory={agentMemory}
        resolveWorkspaceName={resolveWorkspaceName}
        onAgentNodeClick={handleAgentNodeClick}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        cockpitOverlay={cockpitOverlay}
      />
    </div>
  )
}
