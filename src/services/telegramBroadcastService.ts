import api from './api'

// ─── Types ───────────────────────────────────────────────────────────
export type BroadcastAudience = 'active' | 'all' | 'selected' | 'test'
export type BroadcastStatus = 'sending' | 'done' | 'cancelled'
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'cancelled' | 'deleted'
export type MediaKind = 'photo' | 'video' | 'animation'

export interface BroadcastButton {
  text: string
  url: string
}

export interface BroadcastMedia {
  id: string
  kind: MediaKind | string
  url: string
}

export interface BroadcastRecipient {
  broker_id: number
  username: string
  full_name: string
  status: RecipientStatus
  error: string | null
  sent_at: string | null
}

export interface Broadcast {
  id: number
  title: string
  message_html: string
  buttons: BroadcastButton[]
  audience: BroadcastAudience | string
  is_test: boolean
  status: BroadcastStatus | string
  total: number
  sent: number
  failed: number
  pending: number
  media: BroadcastMedia | null
  created_by: string
  created_at: string
  finished_at: string | null
  unsent_at: string | null
  recipients?: BroadcastRecipient[]
}

export interface BroadcastList {
  broadcasts: Broadcast[]
  page: number
  limit: number
  total: number
  bot_running: boolean
}

export interface AudienceBroker {
  id: number
  username: string
  full_name: string
  is_active: boolean
  telegram_linked: boolean
}

export interface Audience {
  bot_running: boolean
  brokers: AudienceBroker[]
  linked: number
  linked_active: number
  not_linked: number
  total_brokers: number
}

export interface PreviewResult {
  html: string
  length: number
  limit: number | null
}

export interface SendPayload {
  title: string
  message: string
  media_id?: string | null
  buttons?: BroadcastButton[]
  audience?: 'active' | 'all' | 'selected'
  broker_ids?: number[]
  test_broker_id?: number | null
}

// ─── Limits (from TELEGRAM_BROADCASTS.md) ────────────────────────────
export const LIMITS = {
  message: 4096,
  caption: 1024,
  title: 200,
  buttons: 6,
  buttonText: 64,
}

export const MEDIA_RULES: Record<MediaKind, { exts: string[]; maxMb: number; label: string }> = {
  photo: { exts: ['jpg', 'jpeg', 'png', 'webp'], maxMb: 10, label: 'Photo' },
  video: { exts: ['mp4', 'm4v', 'mov'], maxMb: 50, label: 'Video' },
  animation: { exts: ['gif'], maxMb: 50, label: 'GIF' },
}

export const ACCEPTED_MEDIA = '.jpg,.jpeg,.png,.webp,.mp4,.m4v,.mov,.gif'

/** Which media kind a file is, or null if the type isn't allowed. */
export const mediaKindOf = (file: File): MediaKind | null => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return (Object.keys(MEDIA_RULES) as MediaKind[]).find((k) => MEDIA_RULES[k].exts.includes(ext)) ?? null
}

// ─── Helpers ─────────────────────────────────────────────────────────
const num = (v: any) => (v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v))
const root = (res: any) => res?.data?.data ?? res?.data ?? {}

const normalizeBroadcast = (b: any): Broadcast => ({
  id: num(b?.id),
  title: b?.title ?? '',
  message_html: b?.message_html ?? b?.message ?? '',
  buttons: Array.isArray(b?.buttons) ? b.buttons : [],
  audience: b?.audience ?? '',
  is_test: !!b?.is_test,
  status: b?.status ?? '',
  total: num(b?.total),
  sent: num(b?.sent),
  failed: num(b?.failed),
  pending: num(b?.pending),
  media: b?.media && b.media.id ? b.media : null,
  created_by: b?.created_by ?? '',
  created_at: b?.created_at ?? '',
  finished_at: b?.finished_at ?? null,
  unsent_at: b?.unsent_at ?? null,
  recipients: Array.isArray(b?.recipients)
    ? b.recipients.map((r: any) => ({
        broker_id: num(r.broker_id),
        username: r.username ?? '',
        full_name: r.full_name ?? '',
        status: r.status ?? 'pending',
        error: r.error ?? null,
        sent_at: r.sent_at ?? null,
      }))
    : undefined,
})

const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }

// ─── Service ─────────────────────────────────────────────────────────
export const telegramBroadcastService = {
  // POST /api/telegram/broadcast-media (multipart, field "file") → media_id
  async uploadMedia(file: File, onProgress?: (fraction: number) => void): Promise<{ media_id: string; kind: string }> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/api/telegram/broadcast-media', fd, {
      ...multipart,
      onUploadProgress: (e: any) => {
        if (e.total) onProgress?.(e.loaded / e.total)
      },
    })
    const d = root(res)
    const media_id = d.media_id ?? d.id ?? d.media?.id
    if (!media_id) throw new Error('Upload succeeded but no media id was returned')
    return { media_id, kind: d.kind ?? d.media?.kind ?? '' }
  },

  // GET /api/telegram/broadcast-media/{id} (needs auth → fetch as blob)
  async getMediaObjectUrl(url: string): Promise<string> {
    const res = await api.get(url, { responseType: 'blob' })
    return URL.createObjectURL(res.data)
  },

  // GET /api/telegram/broadcast-audience
  async getAudience(): Promise<Audience> {
    const d = root(await api.get('/api/telegram/broadcast-audience'))
    return {
      bot_running: !!d.bot_running,
      brokers: Array.isArray(d.brokers)
        ? d.brokers.map((b: any) => ({
            id: num(b.id),
            username: String(b.username ?? '').trim(),
            full_name: b.full_name ?? '',
            is_active: !!b.is_active,
            telegram_linked: !!b.telegram_linked,
          }))
        : [],
      linked: num(d.linked),
      linked_active: num(d.linked_active),
      not_linked: num(d.not_linked),
      total_brokers: num(d.total_brokers),
    }
  },

  // POST /api/telegram/broadcast-preview → cleaned HTML + length
  async preview(message: string, has_media: boolean): Promise<PreviewResult> {
    const d = root(await api.post('/api/telegram/broadcast-preview', { message, has_media }))
    return {
      html: d.html ?? d.message_html ?? d.cleaned_html ?? d.cleaned ?? '',
      length: num(d.length ?? d.text_length ?? d.chars),
      limit: d.limit ?? d.max_length ?? null,
    }
  },

  // POST /api/telegram/broadcasts (test, active, all or selected) → 202
  async send(payload: SendPayload): Promise<{ broadcast: Broadcast; message: string }> {
    const res = await api.post('/api/telegram/broadcasts', payload)
    const d = root(res)
    return {
      broadcast: normalizeBroadcast(d.broadcast ?? d),
      message: res?.data?.message ?? '',
    }
  },

  // GET /api/telegram/broadcasts?page=&limit=
  async list(page = 1, limit = 20): Promise<BroadcastList> {
    const d = root(await api.get('/api/telegram/broadcasts', { params: { page, limit } }))
    return {
      broadcasts: Array.isArray(d.broadcasts) ? d.broadcasts.map(normalizeBroadcast) : [],
      page: num(d.page) || page,
      limit: num(d.limit) || limit,
      total: num(d.total),
      bot_running: !!d.bot_running,
    }
  },

  // GET /api/telegram/broadcasts/{id} (adds recipients)
  async get(id: number): Promise<Broadcast> {
    const d = root(await api.get(`/api/telegram/broadcasts/${id}`))
    return normalizeBroadcast(d.broadcast ?? d)
  },

  // POST /api/telegram/broadcasts/{id}/cancel
  async cancel(id: number): Promise<void> {
    await api.post(`/api/telegram/broadcasts/${id}/cancel`)
  },

  // POST /api/telegram/broadcasts/{id}/unsend (Telegram allows within 48h)
  async unsend(id: number): Promise<void> {
    await api.post(`/api/telegram/broadcasts/${id}/unsend`)
  },
}

/** Unsend is only possible within 48 hours of sending. */
export const canUnsend = (b: Broadcast): boolean => {
  if (b.unsent_at || b.sent === 0) return false
  const t = new Date(b.created_at.replace(' ', 'T')).getTime()
  return Number.isFinite(t) && Date.now() - t < 48 * 3600 * 1000
}

export default telegramBroadcastService
