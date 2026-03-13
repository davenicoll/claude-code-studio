import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Server, Shield, FileText, RefreshCw, Save, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { McpConfig, McpServerConfig, PermissionSettings } from '@shared/types'

type ConfigTab = 'mcp' | 'claude-md' | 'permissions'

interface ConfigPanelProps {
  projectPath?: string
  className?: string
}

export function ConfigPanel({ projectPath, className }: ConfigPanelProps): JSX.Element {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ConfigTab>('mcp')

  const tabs: { id: ConfigTab; label: string; icon: typeof Server }[] = [
    { id: 'mcp', label: 'MCP Servers', icon: Server },
    { id: 'claude-md', label: 'CLAUDE.md', icon: FileText },
    { id: 'permissions', label: t('config.permissions', 'Permissions'), icon: Shield }
  ]

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs transition-colors border-b-2',
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'mcp' && <McpTab projectPath={projectPath} />}
        {activeTab === 'claude-md' && <ClaudeMdTab projectPath={projectPath} />}
        {activeTab === 'permissions' && <PermissionsTab />}
      </div>
    </div>
  )
}

// ── B-2: MCP Management Panel ──

function McpTab({ projectPath }: { projectPath?: string }): JSX.Element {
  const [scope, setScope] = useState<'global' | 'project'>('global')
  const [config, setConfig] = useState<McpConfig>({ mcpServers: {} })
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCommand, setNewCommand] = useState('')
  const [newArgs, setNewArgs] = useState('')

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const cfg = await window.api.getMcpConfig(scope, scope === 'project' ? projectPath : undefined)
    setConfig(cfg)
    setLoading(false)
  }, [scope, projectPath])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || !newCommand.trim()) return
    const server: McpServerConfig = {
      command: newCommand.trim(),
      args: newArgs.trim() ? newArgs.split(/\s+/) : undefined
    }
    const updated: McpConfig = {
      mcpServers: { ...config.mcpServers, [newName.trim()]: server }
    }
    await window.api.updateMcpConfig(scope, updated, scope === 'project' ? projectPath : undefined)
    setConfig(updated)
    setNewName('')
    setNewCommand('')
    setNewArgs('')
  }, [newName, newCommand, newArgs, config, scope, projectPath])

  const handleDelete = useCallback(async (name: string) => {
    const servers = { ...config.mcpServers }
    delete servers[name]
    const updated: McpConfig = { mcpServers: servers }
    await window.api.updateMcpConfig(scope, updated, scope === 'project' ? projectPath : undefined)
    setConfig(updated)
  }, [config, scope, projectPath])

  const serverEntries = Object.entries(config.mcpServers)

  return (
    <div className="space-y-4">
      {/* Scope toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setScope('global')}
          className={cn('px-3 py-1 text-xs rounded-full transition-colors', scope === 'global' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
        >
          Global
        </button>
        {projectPath && (
          <button
            onClick={() => setScope('project')}
            className={cn('px-3 py-1 text-xs rounded-full transition-colors', scope === 'project' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
          >
            Project
          </button>
        )}
        <button onClick={loadConfig} className="ml-auto p-1 text-muted-foreground hover:text-foreground" title="Refresh">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Server list */}
      {serverEntries.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-8">
          No MCP servers configured
        </div>
      ) : (
        <div className="space-y-2">
          {serverEntries.map(([name, server]) => (
            <div key={name} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/50 group">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{name}</div>
                <div className="text-[10px] text-muted-foreground truncate font-mono">
                  {server.command} {server.args?.join(' ') ?? ''}
                </div>
              </div>
              <button
                onClick={() => handleDelete(name)}
                className="p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-destructive/20 text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="space-y-2 p-3 rounded-lg border border-dashed border-border/50 bg-muted/10">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Add Server</div>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Server name"
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <input
          value={newCommand}
          onChange={(e) => setNewCommand(e.target.value)}
          placeholder="Command (e.g. npx)"
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <input
          value={newArgs}
          onChange={(e) => setNewArgs(e.target.value)}
          placeholder="Arguments (space-separated)"
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || !newCommand.trim()}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={12} />
          Add
        </button>
      </div>
    </div>
  )
}

// ── B-3: CLAUDE.md Editor ──

function ClaudeMdTab({ projectPath }: { projectPath?: string }): JSX.Element {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!projectPath) { setLoading(false); return }
    window.api.getClaudeMd(projectPath).then((md) => {
      setContent(md)
      setLoading(false)
    })
  }, [projectPath])

  const handleSave = useCallback(async () => {
    if (!projectPath) return
    await window.api.saveClaudeMd(projectPath, content)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [projectPath, content])

  if (!projectPath) {
    return (
      <div className="text-center text-xs text-muted-foreground py-8">
        Select a workspace to edit its CLAUDE.md
      </div>
    )
  }

  if (loading) {
    return <div className="text-center text-xs text-muted-foreground py-8">Loading...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <span className="font-mono">{projectPath}/CLAUDE.md</span>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-1 text-xs px-3 py-1 rounded transition-colors',
            saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          <Save size={12} />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-[300px] text-xs font-mono px-3 py-2 rounded-md border border-border bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary/50 scrollbar-thin scrollbar-thumb-border"
        placeholder="# CLAUDE.md&#10;&#10;Write project-specific instructions for Claude here..."
      />
    </div>
  )
}

// ── B-4: Permissions / Skill Management ──

function PermissionsTab(): JSX.Element {
  const [permissions, setPermissions] = useState<PermissionSettings>({ allowedTools: [], deniedTools: [] })
  const [loading, setLoading] = useState(true)
  const [newAllowed, setNewAllowed] = useState('')
  const [newDenied, setNewDenied] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.getPermissions().then((p) => {
      setPermissions(p)
      setLoading(false)
    })
  }, [])

  const handleSave = useCallback(async () => {
    await window.api.updatePermissions(permissions)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [permissions])

  const addAllowed = useCallback(() => {
    if (!newAllowed.trim()) return
    setPermissions((p) => ({ ...p, allowedTools: [...new Set([...p.allowedTools, newAllowed.trim()])] }))
    setNewAllowed('')
  }, [newAllowed])

  const addDenied = useCallback(() => {
    if (!newDenied.trim()) return
    setPermissions((p) => ({ ...p, deniedTools: [...new Set([...p.deniedTools, newDenied.trim()])] }))
    setNewDenied('')
  }, [newDenied])

  if (loading) {
    return <div className="text-center text-xs text-muted-foreground py-8">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Claude Code tool permissions</div>
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-1 text-xs px-3 py-1 rounded transition-colors',
            saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          <Save size={12} />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Allowed */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs font-medium text-green-400">
          <ChevronRight size={12} />
          Allowed Tools ({permissions.allowedTools.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {permissions.allowedTools.map((tool) => (
            <span key={tool} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px]">
              {tool}
              <button
                onClick={() => setPermissions((p) => ({ ...p, allowedTools: p.allowedTools.filter((t) => t !== tool) }))}
                className="hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={newAllowed}
            onChange={(e) => setNewAllowed(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllowed()}
            placeholder="Tool name (e.g. Bash)"
            className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button onClick={addAllowed} className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Denied */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs font-medium text-red-400">
          <ChevronRight size={12} />
          Denied Tools ({permissions.deniedTools.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {permissions.deniedTools.map((tool) => (
            <span key={tool} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px]">
              {tool}
              <button
                onClick={() => setPermissions((p) => ({ ...p, deniedTools: p.deniedTools.filter((t) => t !== tool) }))}
                className="hover:text-foreground"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={newDenied}
            onChange={(e) => setNewDenied(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDenied()}
            placeholder="Tool name (e.g. WebFetch)"
            className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button onClick={addDenied} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
            <Plus size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
