import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { keys: 'Ctrl+N', action: 'New Agent' },
  { keys: 'Ctrl+K', action: 'Command Palette' },
  { keys: 'Ctrl+L', action: 'Focus Composer' },
  { keys: 'Ctrl+D', action: 'Toggle Dashboard' },
  { keys: 'Ctrl+Shift+B', action: 'Broadcast' },
  { keys: 'Ctrl+Shift+P', action: 'Toggle Right Pane' },
  { keys: 'Ctrl+Tab', action: 'Next Agent' },
  { keys: 'Ctrl+Shift+Tab', action: 'Previous Agent' },
  { keys: 'Ctrl+1-9', action: 'Switch to Agent #N' },
  { keys: 'Ctrl+W', action: 'Archive Agent' },
  { keys: 'Ctrl+=', action: 'Zoom In (Terminal Font)' },
  { keys: 'Ctrl+-', action: 'Zoom Out (Terminal Font)' },
  { keys: 'Up/Down', action: 'Message History (in Composer)' },
  { keys: 'Enter', action: 'Send Message' },
  { keys: 'Shift+Enter', action: 'New Line' },
  { keys: 'Ctrl+?', action: 'This Help' }
]

export function ShortcutHelp(): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === '?') {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
      <div
        className="bg-card border border-border rounded-xl w-[400px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-accent">
            <X size={14} />
          </button>
        </div>
        <div className="p-2 max-h-[400px] overflow-y-auto">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs text-muted-foreground">{s.action}</span>
              <kbd className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
