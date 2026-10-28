import api from './api'

// ─── Types (GET /api/brokers/activity) ───────────────────────────────
export type ActivityChannel = 'app' | 'telegram' | 'ai'

export interface BrokerActivityToday {
  app_requests: number
  telegram_actions: number
  ai_requests: number
}

export interface BrokerActivityRow {
  id: number
  username: string
  full_name: string
  is_active: boolean
  live: boolean
  connections: number
  last_active_at: string | null
  last_active_ts: number | null
  last_active_channel: ActivityChannel | null
  idle_seconds: number | null
  last_login_at: string | null
  active_days: number
  today: BrokerActivityToday
}

export interface BrokerActivitySummary {
  total_brokers: number
  active_accounts: number
  live_now: number
  active_today: number
  active_7d: number
  active_30d: number
  never_used: number
  live_by_channel: Record<ActivityChannel, number>
}

export interface BrokerActivityDaily {
  date: string
  brokers: number
}

export interface BrokerActivityData {
  generated_at: string
  timezone: string
  live_minutes: number
  days: number
  summary: BrokerActivitySummary
  daily: BrokerActivityDaily[]
  brokers: BrokerActivityRow[]
}

export interface BrokerActivityParams {
  live_minutes?: number // 1–60, default 5
  days?: number // 1–90, default 30
  live_only?: boolean // default false
}

const num = (v: any) => (v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v))

const normalize = (raw: any): BrokerActivityData => {
  const d = raw?.data?.data ?? raw?.data ?? {}
  const s = d.summary ?? {}
  const ch = s.live_by_channel ?? {}
  return {
    generated_at: d.generated_at ?? '',
    timezone: d.timezone ?? '',
    live_minutes: num(d.live_minutes),
    days: num(d.days),
    summary: {
      total_brokers: num(s.total_brokers),
      active_accounts: num(s.active_accounts),
      live_now: num(s.live_now),
      active_today: num(s.active_today),
      active_7d: num(s.active_7d),
      active_30d: num(s.active_30d),
      never_used: num(s.never_used),
      live_by_channel: { app: num(ch.app), telegram: num(ch.telegram), ai: num(ch.ai) },
    },
    daily: Array.isArray(d.daily) ? d.daily.map((x: any) => ({ date: x.date, brokers: num(x.brokers) })) : [],
    brokers: Array.isArray(d.brokers)
      ? d.brokers.map((b: any) => ({
          id: num(b.id),
          username: b.username ?? '',
          full_name: b.full_name ?? '',
          is_active: !!b.is_active,
          live: !!b.live,
          connections: num(b.connections),
          last_active_at: b.last_active_at ?? null,
          last_active_ts: b.last_active_ts ?? null,
          last_active_channel: b.last_active_channel ?? null,
          idle_seconds: b.idle_seconds ?? null,
          last_login_at: b.last_login_at ?? null,
          active_days: num(b.active_days),
          today: {
            app_requests: num(b.today?.app_requests),
            telegram_actions: num(b.today?.telegram_actions),
            ai_requests: num(b.today?.ai_requests),
          },
        }))
      : [],
  }
}

export const brokerActivityService = {
  // GET /api/brokers/activity?live_minutes=&days=&live_only=
  async getActivity(params: BrokerActivityParams = {}): Promise<BrokerActivityData> {
    const query: Record<string, string | number | boolean> = {}
    if (params.live_minutes) query.live_minutes = params.live_minutes
    if (params.days) query.days = params.days
    if (params.live_only) query.live_only = true
    const res = await api.get('/api/brokers/activity', { params: query })
    return normalize(res)
  },
}

export default brokerActivityService
