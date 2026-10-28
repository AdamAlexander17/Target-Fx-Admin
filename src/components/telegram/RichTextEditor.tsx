import React, { useEffect, useRef, useState } from 'react'
import { LinkIcon, ListBulletIcon, NumberedListIcon, CodeBracketIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

/**
 * Lightweight rich-text editor (contentEditable). Its toolbar only produces
 * tags the backend converts for Telegram: b, i, u, s, a, ul/ol/li, blockquote,
 * code and the tg-spoiler span. Pasted content is inserted as plain text so
 * unsupported markup (colours, fonts, tables) never sneaks in.
 */
const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder }) => {
  const ref = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')

  // Only push external value changes into the DOM (e.g. reset), never while typing
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value
  }, [value])

  const emit = () => onChange(ref.current?.innerHTML ?? '')

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  // Wrap the current selection in an inline element (code / spoiler)
  const wrap = (tag: 'code' | 'spoiler') => {
    ref.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const text = sel.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const html = tag === 'code' ? `<code>${text}</code>` : `<span class="tg-spoiler">${text}</span>`
    document.execCommand('insertHTML', false, html)
    emit()
  }

  const openLink = () => {
    const sel = window.getSelection()
    savedRange.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
    setLinkUrl('https://')
    setLinkOpen(true)
  }

  const applyLink = () => {
    const url = linkUrl.trim()
    if (!/^(https?:\/\/|tg:\/\/|mailto:)/i.test(url)) return
    ref.current?.focus()
    const sel = window.getSelection()
    if (sel && savedRange.current) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
    if (sel && !sel.isCollapsed) document.execCommand('createLink', false, url)
    else document.execCommand('insertHTML', false, `<a href="${url}">${url}</a>`)
    emit()
    setLinkOpen(false)
  }

  const Btn = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection
      onClick={onClick}
      className="flex h-8 min-w-[2rem] items-center justify-center rounded-md px-1.5 text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-900"
    >
      {children}
    </button>
  )

  const linkValid = /^(https?:\/\/|tg:\/\/|mailto:)\S+/i.test(linkUrl.trim())

  return (
    <div className="rounded-lg border-2 border-slate-300 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 rounded-t-lg">
        <Btn title="Bold (Ctrl+B)" onClick={() => exec('bold')}><span className="font-bold">B</span></Btn>
        <Btn title="Italic (Ctrl+I)" onClick={() => exec('italic')}><span className="italic font-serif">I</span></Btn>
        <Btn title="Underline (Ctrl+U)" onClick={() => exec('underline')}><span className="underline">U</span></Btn>
        <Btn title="Strikethrough" onClick={() => exec('strikeThrough')}><span className="line-through">S</span></Btn>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <Btn title="Link" onClick={openLink}><LinkIcon className="h-4 w-4" /></Btn>
        <Btn title="Bulleted list" onClick={() => exec('insertUnorderedList')}><ListBulletIcon className="h-4 w-4" /></Btn>
        <Btn title="Numbered list" onClick={() => exec('insertOrderedList')}><NumberedListIcon className="h-4 w-4" /></Btn>
        <Btn title="Quote" onClick={() => exec('formatBlock', 'blockquote')}><span className="text-base leading-none">❝</span></Btn>
        <Btn title="Code (select text first)" onClick={() => wrap('code')}><CodeBracketIcon className="h-4 w-4" /></Btn>
        <Btn title="Spoiler (select text first)" onClick={() => wrap('spoiler')}><EyeSlashIcon className="h-4 w-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <Btn title="Clear formatting" onClick={() => { exec('removeFormat'); exec('formatBlock', 'p') }}>
          <span className="text-xs font-semibold">Tx</span>
        </Btn>
      </div>

      {/* Inline link input */}
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-blue-50/60 px-2 py-1.5">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') setLinkOpen(false)
            }}
            placeholder="https://..."
            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <button
            type="button"
            onClick={applyLink}
            disabled={!linkValid}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Add link
          </button>
          <button type="button" onClick={() => setLinkOpen(false)} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Editable area */}
      <div className="relative">
        {!value.replace(/<[^>]*>/g, '').trim() && (
          <p className="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400">{placeholder}</p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={(e) => {
            e.preventDefault()
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
          }}
          className="tg-editor min-h-[140px] max-h-[280px] overflow-y-auto px-3 py-2.5 text-sm text-slate-900 focus:outline-none"
        />
      </div>

      <style>{`
        .tg-editor ul { list-style: disc; padding-left: 1.25rem; }
        .tg-editor ol { list-style: decimal; padding-left: 1.25rem; }
        .tg-editor blockquote { border-left: 3px solid #93c5fd; padding-left: .6rem; color: #475569; }
        .tg-editor code { background: #f1f5f9; padding: 0 .25rem; border-radius: .25rem; font-family: ui-monospace, monospace; font-size: .85em; }
        .tg-editor a { color: #2563eb; text-decoration: underline; }
        .tg-editor .tg-spoiler { background: #cbd5e1; border-radius: .2rem; }
      `}</style>
    </div>
  )
}

export default RichTextEditor
