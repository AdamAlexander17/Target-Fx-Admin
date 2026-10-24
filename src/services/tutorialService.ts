import api from './api'
import { getApiBaseUrl } from '../lib/apiBase'

// ─── Types ───────────────────────────────────────────────────────────
export interface Tutorial {
  id: number
  title: string
  description: string
  language: string
  visibility: string
  category: string
  sort_order: number
  duration_seconds: number
  is_active: boolean
  language_name?: string // full name from backend, e.g. "English", "Gujarati"
  video_url?: string | null
  thumbnail_url?: string | null
  created_at?: string
  updated_at?: string
}

// Metadata sent on create (files are appended separately into FormData)
export interface TutorialMetadata {
  title: string
  description: string
  language: string
  visibility: string
  category: string
  sort_order: number
  duration_seconds: number
  is_active: boolean
}

// PUT /api/tutorials/:id accepts any subset of the editable metadata
export type UpdateTutorialData = Partial<TutorialMetadata>

export interface CreateTutorialInput extends TutorialMetadata {
  upload_id?: string // finished chunked upload (preferred)
  video?: File | null // fallback: small one-request upload
  thumbnail?: File | null
}

export interface ReplaceFilesInput {
  upload_id?: string // finished chunked upload for a new video
  video?: File | null // fallback: small one-request upload
  thumbnail?: File | null
  remove_thumbnail?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────
const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

const toBool = (v: any): boolean => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return ['true', '1', 'yes', 'active'].includes(v.toLowerCase())
  return false
}

// Resolve a possibly-relative media path returned by the backend to an
// absolute URL the browser can load directly.
export const resolveMediaUrl = (path?: string | null): string | null => {
  if (!path) return null
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path
  }
  const base = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

const normalizeTutorial = (t: any): Tutorial => ({
  id: toNumber(t?.id ?? t?.tutorial_id),
  title: t?.title ?? '',
  description: t?.description ?? '',
  language: t?.language ?? '',
  visibility: t?.visibility ?? '',
  category: t?.category ?? '',
  sort_order: toNumber(t?.sort_order),
  duration_seconds: toNumber(t?.duration_seconds ?? t?.duration),
  is_active: toBool(t?.is_active),
  language_name: t?.language_name ?? t?.languageName ?? undefined,
  // Accept a range of possible key names for the media URLs
  video_url: t?.video_url ?? t?.videoUrl ?? t?.video ?? t?.video_path ?? null,
  thumbnail_url: t?.thumbnail_url ?? t?.thumbnailUrl ?? t?.thumbnail ?? t?.thumbnail_path ?? null,
  created_at: t?.created_at ?? t?.createdAt,
  updated_at: t?.updated_at ?? t?.updatedAt,
})

// Pull the tutorial array out of whatever envelope the API uses
const extractList = (res: any): Tutorial[] => {
  const root = res?.data ?? {}
  const arr =
    (Array.isArray(root) && root) ||
    (Array.isArray(root.tutorials) && root.tutorials) ||
    (Array.isArray(root.data) && root.data) ||
    (Array.isArray(root.data?.tutorials) && root.data.tutorials) ||
    (Array.isArray(root.items) && root.items) ||
    []
  return arr.map(normalizeTutorial)
}

const extractOne = (res: any): Tutorial => {
  const root = res?.data ?? {}
  const obj = root.tutorial ?? root.data?.tutorial ?? root.data ?? root
  return normalizeTutorial(obj)
}

// Config that lets axios build the multipart boundary itself (the default
// instance Content-Type is application/json, which would JSON-encode FormData).
// A long timeout is used because video uploads far exceed the default 30s.
const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 600000, // 10 minutes for large video uploads
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
}

const appendMetadata = (fd: FormData, data: TutorialMetadata) => {
  fd.append('title', data.title)
  fd.append('description', data.description)
  fd.append('language', data.language)
  fd.append('visibility', data.visibility)
  fd.append('category', data.category)
  fd.append('sort_order', String(data.sort_order))
  fd.append('duration_seconds', String(data.duration_seconds))
  fd.append('is_active', String(data.is_active))
}

// ─── Service ─────────────────────────────────────────────────────────
export const tutorialService = {
  // GET /api/tutorials — list
  async getTutorials(): Promise<Tutorial[]> {
    const res = await api.get('/api/tutorials')
    return extractList(res)
  },

  // GET /api/tutorials/:id — single
  async getTutorial(id: number): Promise<Tutorial> {
    const res = await api.get(`/api/tutorials/${id}`)
    return extractOne(res)
  },

  // POST /api/tutorials — create. Uses a finished chunked upload (upload_id)
  // when present, otherwise a direct video file (small one-request upload).
  async createTutorial(input: CreateTutorialInput): Promise<Tutorial> {
    const fd = new FormData()
    if (input.upload_id) fd.append('upload_id', input.upload_id)
    else if (input.video) fd.append('video', input.video)
    if (input.thumbnail) fd.append('thumbnail', input.thumbnail)
    appendMetadata(fd, input)
    const res = await api.post('/api/tutorials', fd, multipartConfig)
    return extractOne(res)
  },

  // PUT /api/tutorials/:id — update metadata only (JSON)
  async updateTutorial(id: number, data: UpdateTutorialData): Promise<Tutorial> {
    const res = await api.put(`/api/tutorials/${id}`, data)
    return extractOne(res)
  },

  // POST /api/tutorials/:id/files — replace video / thumbnail (multipart).
  // A new video comes from a finished chunked upload (upload_id) or a file.
  async replaceFiles(id: number, input: ReplaceFilesInput): Promise<Tutorial> {
    const fd = new FormData()
    if (input.upload_id) fd.append('upload_id', input.upload_id)
    else if (input.video) fd.append('video', input.video)
    if (input.thumbnail) fd.append('thumbnail', input.thumbnail)
    if (input.remove_thumbnail) fd.append('remove_thumbnail', 'true')
    const res = await api.post(`/api/tutorials/${id}/files`, fd, multipartConfig)
    return extractOne(res)
  },

  // DELETE /api/tutorials/:id — delete
  async deleteTutorial(id: number): Promise<void> {
    await api.delete(`/api/tutorials/${id}`)
  },
}

export default tutorialService
