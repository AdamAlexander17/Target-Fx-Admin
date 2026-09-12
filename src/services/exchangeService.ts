import api from './api'

// ─── Types ───────────────────────────────────────────────────────────
export interface ExchangeMetric {
  Exchange: string
  Commission: number
  Lots: number
  Volume: number
}

export interface ExchangeReportRow {
  Login: number | string
  Name: string
  AgentCommission: number
  Exchanges: ExchangeMetric[]
}

export interface ExchangeReportTotals {
  AgentCommission: number
  Exchanges: ExchangeMetric[]
}

export interface ExchangeSettlementWeek {
  id: number
  name?: string
  start_date?: string
  end_date?: string
}

export interface ExchangePagination {
  limit: number
  page: number
  total: number
  total_pages: number
}

export interface ExchangeDataResponse {
  exchanges: string[]
  report: ExchangeReportRow[]
  totals: ExchangeReportTotals
  settlementWeek?: ExchangeSettlementWeek
  pagination: ExchangePagination
}

// ─── Helpers ────────────────────────────────────────────────────────
const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

const extractResponse = (res: any): ExchangeDataResponse => {
  const root = res?.data?.data ?? res?.data ?? {}

  const report: ExchangeReportRow[] = Array.isArray(root.Report)
    ? root.Report.map((r: any) => ({
        Login: r.Login,
        Name: r.Name ?? String(r.Login ?? ''),
        AgentCommission: toNumber(r.AgentCommission),
        Exchanges: Array.isArray(r.Exchanges)
          ? r.Exchanges.map((e: any) => ({
              Exchange: e.Exchange,
              Commission: toNumber(e.Commission),
              Lots: toNumber(e.Lots),
              Volume: toNumber(e.Volume),
            }))
          : [],
      }))
    : []

  return {
    exchanges: Array.isArray(root.Exchanges) ? root.Exchanges : [],
    report,
    totals: {
      AgentCommission: toNumber(root.Totals?.AgentCommission),
      Exchanges: Array.isArray(root.Totals?.Exchanges)
        ? root.Totals.Exchanges.map((e: any) => ({
            Exchange: e.Exchange,
            Commission: toNumber(e.Commission),
            Lots: toNumber(e.Lots),
            Volume: toNumber(e.Volume),
          }))
        : [],
    },
    settlementWeek: root.SettlementWeek,
    pagination: {
      limit: Number(root.pagination?.limit ?? report.length),
      page: Number(root.pagination?.page ?? 1),
      total: Number(root.pagination?.total ?? report.length),
      total_pages: Number(root.pagination?.total_pages ?? 1),
    },
  }
}

// Optional custom date range (YYYY-MM-DD). When provided, the request is
// filtered by date instead of by settlement week.
export interface ExchangeDateRange {
  from: string
  to: string
}

export const exchangeService = {
  // ── POST /api/admin/brokers/:brokerId/exchange-data (all logins) ────
  async getExchangeData(
    brokerId: number,
    weekId: number | null,
    page = 1,
    limit = 10,
    dateRange?: ExchangeDateRange | null
  ): Promise<ExchangeDataResponse> {
    const body: Record<string, any> = { page, limit }

    if (dateRange?.from && dateRange?.to) {
      // Date-range filtered request.
      body.from = dateRange.from
      body.to = dateRange.to
    } else if (weekId != null) {
      // Settlement-week filtered request (default).
      body.week_id = weekId
    }

    const res = await api.post(
      `/api/admin/brokers/${brokerId}/exchange-data`,
      body
    )
    return extractResponse(res)
  },

  // ── POST .../exchange-data filtered to specific logins ───────────────
  async getExchangeDataForLogins(
    brokerId: number,
    weekId: number,
    logins: Array<number | string>
  ): Promise<ExchangeDataResponse> {
    const res = await api.post(`/api/admin/brokers/${brokerId}/exchange-data`, {
      week_id: weekId,
      logins: logins.map(Number),
    })
    return extractResponse(res)
  },
}

export default exchangeService
