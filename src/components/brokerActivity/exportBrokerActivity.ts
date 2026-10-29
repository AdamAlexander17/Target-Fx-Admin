import ExcelJS from 'exceljs'
import type { BrokerActivityData, BrokerActivityRow } from '../../services/brokerActivityService'

// ─── Row shaping (shared by Excel + CSV) ─────────────────────────────
const CHANNEL_LABEL: Record<string, string> = { app: 'App', telegram: 'Telegram', ai: 'AI' }

const idleSeconds = (b: BrokerActivityRow): number | null => {
  if (b.idle_seconds !== null && b.idle_seconds !== undefined) return b.idle_seconds
  if (b.last_active_ts) return Math.max(0, Math.floor(Date.now() / 1000 - b.last_active_ts))
  return null
}

const idleText = (s: number | null) => {
  if (s === null) return ''
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const statusOf = (b: BrokerActivityRow) => (b.live ? 'Live' : b.last_active_at ? 'Idle' : 'Never used')

const COLUMNS: { header: string; width: number; value: (b: BrokerActivityRow) => string | number }[] = [
  { header: 'ID', width: 8, value: (b) => b.id },
  { header: 'Username', width: 16, value: (b) => b.username },
  { header: 'Full Name', width: 26, value: (b) => b.full_name },
  { header: 'Status', width: 12, value: statusOf },
  { header: 'Account', width: 11, value: (b) => (b.is_active ? 'Active' : 'Disabled') },
  { header: 'Last Active', width: 20, value: (b) => b.last_active_at ?? '' },
  { header: 'Idle', width: 9, value: (b) => idleText(idleSeconds(b)) },
  { header: 'Last Channel', width: 13, value: (b) => (b.last_active_channel ? CHANNEL_LABEL[b.last_active_channel] ?? b.last_active_channel : '') },
  { header: 'Connections', width: 12, value: (b) => b.connections },
  { header: 'Active Days', width: 12, value: (b) => b.active_days },
  { header: 'Today App Requests', width: 19, value: (b) => b.today.app_requests },
  { header: 'Today Telegram Actions', width: 22, value: (b) => b.today.telegram_actions },
  { header: 'Today AI Requests', width: 18, value: (b) => b.today.ai_requests },
  { header: 'Last Login', width: 20, value: (b) => b.last_login_at ?? '' },
]

const stamp = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ─── CSV ─────────────────────────────────────────────────────────────
const csvCell = (v: string | number) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const exportBrokerActivityCsv = (rows: BrokerActivityRow[], suffix: string) => {
  const lines = [
    COLUMNS.map((c) => csvCell(c.header)).join(','),
    ...rows.map((b) => COLUMNS.map((c) => csvCell(c.value(b))).join(',')),
  ]
  // BOM so Excel opens UTF-8 names correctly
  download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `brokers-activity_${suffix}_${stamp()}.csv`)
}

// ─── Excel ───────────────────────────────────────────────────────────
const NAVY = 'FF1F3A5F'
const WHITE = 'FFFFFFFF'
const GREEN = 'FF15803D'
const AMBER = 'FFB45309'
const SLATE = 'FF64748B'

const styleHeader = (row: ExcelJS.Row) => {
  row.height = 22
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
}

export const exportBrokerActivityExcel = async (data: BrokerActivityData, rows: BrokerActivityRow[], suffix: string) => {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'BrokerEye Admin'
  wb.created = new Date()

  // Sheet 1 — Brokers
  const ws = wb.addWorksheet('Brokers', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.header, width: c.width }))
  styleHeader(ws.getRow(1))
  rows.forEach((b) => {
    const r = ws.addRow(COLUMNS.map((c) => c.value(b)))
    const status = r.getCell(4)
    status.font = { bold: true, color: { argb: b.live ? GREEN : b.last_active_at ? AMBER : SLATE } }
    r.eachCell((cell, col) => {
      if (col !== 2 && col !== 3) cell.alignment = { horizontal: 'center' }
    })
  })
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } }

  // Sheet 2 — Summary
  const s = data.summary
  const sum = wb.addWorksheet('Summary')
  sum.columns = [{ width: 28 }, { width: 26 }]
  const title = sum.addRow(['Brokers Activity'])
  title.font = { bold: true, size: 14, color: { argb: NAVY } }
  sum.addRow([])
  const meta: [string, string | number][] = [
    ['Generated at', data.generated_at],
    ['Timezone', data.timezone],
    ['Live window (minutes)', data.live_minutes],
    ['History (days)', data.days],
    ['Exported view', suffix === 'live' ? 'Live only' : 'All brokers'],
    ['Exported rows', rows.length],
  ]
  meta.forEach(([k, v]) => { const r = sum.addRow([k, v]); r.getCell(1).font = { color: { argb: SLATE } } })
  sum.addRow([])
  const h = sum.addRow(['Metric', 'Value'])
  styleHeader(h)
  const metrics: [string, number][] = [
    ['Live now', s.live_now],
    ['Active today', s.active_today],
    ['Active 7 days', s.active_7d],
    ['Active 30 days', s.active_30d],
    ['Never used', s.never_used],
    ['Total brokers', s.total_brokers],
    ['Active accounts', s.active_accounts],
    ['Live via App', s.live_by_channel.app],
    ['Live via Telegram', s.live_by_channel.telegram],
    ['Live via AI', s.live_by_channel.ai],
  ]
  metrics.forEach(([k, v]) => { const r = sum.addRow([k, v]); r.getCell(2).alignment = { horizontal: 'center' } })

  // Sheet 3 — Daily
  const daily = wb.addWorksheet('Daily', { views: [{ state: 'frozen', ySplit: 1 }] })
  daily.columns = [{ header: 'Date', key: 'date', width: 14 }, { header: 'Active Brokers', key: 'brokers', width: 16 }]
  styleHeader(daily.getRow(1))
  data.daily.forEach((d) => { const r = daily.addRow([d.date, d.brokers]); r.getCell(2).alignment = { horizontal: 'center' } })

  const buf = await wb.xlsx.writeBuffer()
  download(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `brokers-activity_${suffix}_${stamp()}.xlsx`
  )
}
