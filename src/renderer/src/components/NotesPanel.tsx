import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Trash2, Check } from 'lucide-react'
import { cn } from '@lib/utils'

export function NotesPanel(): JSX.Element {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleCopy = useCallback(async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [value])

  const handleClear = useCallback(() => {
    setValue('')
    textareaRef.current?.focus()
  }, [])

  const lineCount = value ? value.split('\n').length : 0
  const charCount = value.length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {value ? `${lineCount} ${t('notes.lines', 'lines')} · ${charCount} ${t('notes.chars', 'chars')}` : t('notes.empty', 'Empty')}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleCopy}
            disabled={!value}
            className={cn(
              'p-1 rounded transition-colors',
              copied ? 'text-green-500' : 'text-muted-foreground hover:bg-accent disabled:opacity-30'
            )}
            title={t('notes.copy', 'Copy all')}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <button
            onClick={handleClear}
            disabled={!value}
            className="p-1 rounded text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            title={t('notes.clear', 'Clear')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('notes.placeholder', 'Free notes — draft prompts, paste snippets, jot ideas...')}
        className="flex-1 w-full resize-none bg-background p-3 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/40 scrollbar-thin scrollbar-thumb-border"
      />
    </div>
  )
}
