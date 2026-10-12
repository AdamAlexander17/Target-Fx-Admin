import ExcelJS from 'exceljs'
import type {
  ExchangeReportRow,
  ExchangeReportTotals,
} from '../../services/exchangeService'

// ─── Styling constants (matched to the brokerage report format) ──────
const NAVY = 'FF1F3A5F' // title bar
const BLUE = 'FF2F5496' // exchange group header
const DARK = 'FF243B63' // column header row
const TOTAL_BG = 'FFDCE6F1'
const RED = 'FFFF0000'
const BLACK = 'FF000000'
const WHITE = 'FFFFFFFF'
const BORDER_STYLE: Partial<ExcelJS.Border> = {
  style: 'thin',
  color: { argb: 'FFB0B0B0' },
}

const NUM_FMT = '#,##0.00'
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface ExchangeExportPeriod {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

const baseFont = (): Partial<ExcelJS.Font> => ({
  name: 'Calibri',
  size: 11,
  color: { argb: BLACK },
})

const headerFont = (): Partial<ExcelJS.Font> => ({
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: WHITE },
})

const allBorders = (): Partial<ExcelJS.Borders> => ({
  top: BORDER_STYLE,
  left: BORDER_STYLE,
  bottom: BORDER_STYLE,
  right: BORDER_STYLE,
})

const fill = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
})

/**
 * Build the brokerage .xlsx report as a Blob.
 *
 * Layout (matches the reference workbook):
 *  Row 1  — merged title: "Brokerage Data <from> to <to>"
 *  Row 2  — "Client Details" merged over first 3 cols, then one merged
 *           group header per exchange (3 cols each)
 *  Row 3  — Login | Name | Agent Commission | Commission/Lots/Volume × N
 *  Row 4+ — data rows (negatives in red)
 *  Last   — Totals row
 */
export const buildExchangeReportBlob = async (
  report: ExchangeReportRow[],
  exchangeCodes: string[],
  totals: ExchangeReportTotals | undefined,
  period: ExchangeExportPeriod
): Promise<Blob> => {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Broker Eye Admin'
  wb.created = new Date()

  const ws = wb.addWorksheet('Brokerage Data', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }],
  })

  const totalCols = 3 + exchangeCodes.length * 3

  // ── Row 1: merged title ────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, totalCols)
  const title = ws.getCell(1, 1)
  title.value = `Brokerage Data ${period.from} to ${period.to}`
  title.font = { ...headerFont(), size: 12 }
  title.alignment = { horizontal: 'center', vertical: 'middle' }
  title.fill = fill(NAVY)
  ws.getRow(1).height = 22
  for (let c = 1; c <= totalCols; c++) {
    ws.getCell(1, c).fill = fill(NAVY)
    ws.getCell(1, c).border = allBorders()
  }

  // ── Row 2: group headers ───────────────────────────────────────────
  ws.mergeCells(2, 1, 2, 3)
  const clientDetails = ws.getCell(2, 1)
  clientDetails.value = 'Client Details'
  clientDetails.font = headerFont()
  clientDetails.alignment = { horizontal: 'center', vertical: 'middle' }

  exchangeCodes.forEach((code, i) => {
    const startCol = 4 + i * 3
    ws.mergeCells(2, startCol, 2, startCol + 2)
    const cell = ws.getCell(2, startCol)
    cell.value = code
    cell.font = headerFont()
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  ws.getRow(2).height = 20
  for (let c = 1; c <= totalCols; c++) {
    const cell = ws.getCell(2, c)
    cell.fill = fill(BLUE)
    cell.border = allBorders()
    if (!cell.font) cell.font = headerFont()
  }

  // ── Row 3: column headers ──────────────────────────────────────────
  const baseHeaders = ['Login', 'Name', 'Agent Commission']
  const subHeaders = ['Commission', 'Lots', 'Volume']
  const headers = [
    ...baseHeaders,
    ...exchangeCodes.flatMap(() => subHeaders),
  ]
  const headerRow = ws.getRow(3)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = headerFont()
    cell.fill = fill(DARK)
    cell.border = allBorders()
    cell.alignment = {
      horizontal: i < 2 ? 'left' : 'right',
      vertical: 'middle',
    }
  })
  headerRow.height = 18

  // Filter dropdowns on the header row (as in the reference file).
  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: totalCols },
  }

  // ── Data rows ──────────────────────────────────────────────────────
  const exchangeOf = (row: ExchangeReportRow, code: string) =>
    row.Exchanges.find((e) => e.Exchange === code)

  report.forEach((row, rIdx) => {
    const excelRow = ws.getRow(4 + rIdx)
    const values: Array<string | number> = [
      Number.isFinite(Number(row.Login)) ? Number(row.Login) : String(row.Login),
      row.Name ?? '',
      row.AgentCommission ?? 0,
      ...exchangeCodes.flatMap((code) => {
        const e = exchangeOf(row, code)
        return [e?.Commission ?? 0, e?.Lots ?? 0, e?.Volume ?? 0]
      }),
    ]

    values.forEach((v, i) => {
      const cell = excelRow.getCell(i + 1)
      cell.value = v
      cell.border = allBorders()
      const negative = typeof v === 'number' && v < 0
      cell.font = {
        ...baseFont(),
        color: { argb: negative ? RED : BLACK },
      }
      if (i === 0) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
        cell.numFmt = '0'
      } else if (i === 1) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
        cell.numFmt = NUM_FMT
      }
    })
  })

  // ── Totals row ─────────────────────────────────────────────────────
  const totalsRowIdx = 4 + report.length
  const totalsRow = ws.getRow(totalsRowIdx)
  const totalValues: Array<string | number> = [
    'Totals',
    `${report.length} client${report.length === 1 ? '' : 's'}`,
    totals?.AgentCommission ?? 0,
    ...exchangeCodes.flatMap((code) => {
      const e = totals?.Exchanges.find((item) => item.Exchange === code)
      return [e?.Commission ?? 0, e?.Lots ?? 0, e?.Volume ?? 0]
    }),
  ]

  totalValues.forEach((v, i) => {
    const cell = totalsRow.getCell(i + 1)
    cell.value = v
    cell.fill = fill(TOTAL_BG)
    cell.border = allBorders()
    const negative = typeof v === 'number' && v < 0
    cell.font = {
      ...baseFont(),
      bold: true,
      color: { argb: negative ? RED : BLACK },
    }
    if (i === 0) {
      cell.numFmt = '0'
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    } else if (i === 1) {
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    } else {
      cell.numFmt = NUM_FMT
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
    }
  })
  totalsRow.height = 18

  // ── Column widths ──────────────────────────────────────────────────
  ws.getColumn(1).width = 10 // Login
  ws.getColumn(2).width = 24 // Name
  ws.getColumn(3).width = 16 // Agent Commission
  for (let c = 4; c <= totalCols; c++) {
    ws.getColumn(c).width = 15
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: XLSX_MIME })
}

/** Build a filename like brokerage_data_WEEK_11_OCTOBER.xlsx */
export const exchangeReportFilename = (
  weekName: string | undefined,
  period: ExchangeExportPeriod
): string => {
  const slug = weekName
    ? weekName
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase()
    : `${period.from}_to_${period.to}`
  return `brokerage_data_${slug}.xlsx`
}

/** Trigger a browser download for a blob. */
export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
