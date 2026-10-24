import api from './api'

// ─── Chunked upload (for videos; required above 100 MB behind Cloudflare) ──
// Flow: start → PUT each missing piece (raw bytes) → finalize create/replace
// with the returned upload_id instead of the video file.

export interface UploadSession {
  upload_id: string
  file_name: string
  file_size: number
  chunk_size: number
  total_chunks: number
  received: number[]
  missing: number[]
  complete: boolean
  expires_at?: string
}

const extractSession = (res: any): UploadSession => {
  const r = res?.data?.data ?? res?.data ?? {}
  const total = Number(r.total_chunks) || 0
  return {
    upload_id: r.upload_id,
    file_name: r.file_name,
    file_size: Number(r.file_size) || 0,
    chunk_size: Number(r.chunk_size) || 0,
    total_chunks: total,
    received: Array.isArray(r.received) ? r.received : [],
    missing: Array.isArray(r.missing) ? r.missing : [],
    complete: !!r.complete,
    expires_at: r.expires_at,
  }
}

// Raw-bytes config — the shared instance defaults to JSON, which would
// corrupt a Blob body, so each chunk forces octet-stream.
const chunkConfig = (signal?: AbortSignal) => ({
  headers: { 'Content-Type': 'application/octet-stream' },
  timeout: 120000, // 2 min per 25 MB piece
  signal,
})

const MAX_PARALLEL = 3
const MAX_RETRIES = 3

export const tutorialUploadService = {
  // POST /api/tutorial-uploads — begin a session
  async start(file: File): Promise<UploadSession> {
    const res = await api.post('/api/tutorial-uploads', {
      file_name: file.name,
      file_size: file.size,
    })
    return extractSession(res)
  },

  // GET /api/tutorial-uploads/:id — which pieces have arrived (to resume)
  async status(uploadId: string): Promise<UploadSession> {
    const res = await api.get(`/api/tutorial-uploads/${uploadId}`)
    return extractSession(res)
  },

  // PUT /api/tutorial-uploads/:id/chunks/:n — one raw piece
  async sendChunk(uploadId: string, n: number, piece: Blob, signal?: AbortSignal): Promise<void> {
    await api.put(`/api/tutorial-uploads/${uploadId}/chunks/${n}`, piece, chunkConfig(signal))
  },

  // DELETE /api/tutorial-uploads/:id — cancel a session (best effort)
  async cancel(uploadId: string): Promise<void> {
    try {
      await api.delete(`/api/tutorial-uploads/${uploadId}`)
    } catch {
      /* ignore — the session also auto-expires in 24h */
    }
  },

  // High-level: upload the whole file in parallel chunks (with retry/resume)
  // and return the upload_id to pass to POST /api/tutorials.
  async uploadVideo(
    file: File,
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const session = await this.start(file)
    const { upload_id, chunk_size, total_chunks } = session
    if (!upload_id || !chunk_size || !total_chunks) {
      throw new Error('Upload could not be started')
    }

    // Pieces still needed (a fresh session needs them all).
    const queue =
      session.missing && session.missing.length
        ? [...session.missing]
        : Array.from({ length: total_chunks }, (_, i) => i)

    let done = total_chunks - queue.length
    const report = () => onProgress?.(total_chunks ? done / total_chunks : 1)
    report()

    let aborted = false
    const sendOne = async (n: number) => {
      const start = n * chunk_size
      const piece = file.slice(start, Math.min(file.size, start + chunk_size))
      for (let attempt = 1; ; attempt++) {
        try {
          await this.sendChunk(upload_id, n, piece, signal)
          break
        } catch (err: any) {
          if (signal?.aborted || err?.name === 'CanceledError' || err?.name === 'AbortError') throw err
          if (attempt >= MAX_RETRIES) throw new Error(`Chunk ${n} failed after ${attempt} attempts`)
        }
      }
      done += 1
      report()
    }

    const worker = async () => {
      while (queue.length) {
        if (signal?.aborted || aborted) throw new DOMException('Aborted', 'AbortError')
        const n = queue.shift()
        if (n === undefined) break
        try {
          await sendOne(n)
        } catch (err) {
          aborted = true
          throw err
        }
      }
    }

    const workerCount = Math.min(MAX_PARALLEL, queue.length) || 1
    await Promise.all(Array.from({ length: workerCount }, () => worker()))
    return upload_id
  },
}

export default tutorialUploadService
