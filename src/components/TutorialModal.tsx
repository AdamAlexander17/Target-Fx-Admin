import React, { useEffect, useMemo, useRef, useState } from 'react'
import SavingOverlay from './ui/SavingOverlay'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, VideoCameraIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import {
  Tutorial,
  CreateTutorialInput,
  UpdateTutorialData,
  ReplaceFilesInput,
  TutorialMetadata,
  resolveMediaUrl,
} from '../services/tutorialService'
import { tutorialUploadService } from '../services/tutorialUploadService'

// Read a video file's duration (seconds) in the browser, before uploading.
const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : 0)
      }
      v.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(0)
      }
      v.src = url
    } catch {
      resolve(0)
    }
  })

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
  tutorial: Tutorial | null // null = create mode
  onCreate: (input: CreateTutorialInput) => void
  onUpdate: (id: number, data: UpdateTutorialData) => void
  onReplaceFiles: (id: number, input: ReplaceFilesInput) => void
  isSaving: boolean
  apiError?: string | null
}

const LANGUAGES = [
  { value: 'hi', label: 'Hindi' },
  { value: 'gu', label: 'Gujarati' },
]

const VISIBILITIES = [
  { value: 'public', label: 'Public' },
  { value: 'logged_in', label: 'Logged in' },
]

const emptyMeta: TutorialMetadata = {
  title: '',
  description: '',
  language: 'hi',
  visibility: 'logged_in',
  category: '',
  sort_order: 0,
  duration_seconds: 0,
  is_active: true,
}

const inputCls =
  'w-full px-3 py-2 text-sm border-2 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all'
const labelCls = 'block text-xs font-semibold mb-1.5 text-slate-700'

const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  tutorial,
  onCreate,
  onUpdate,
  onReplaceFiles,
  isSaving,
  apiError,
}) => {
  const isEdit = !!tutorial
  const [tab, setTab] = useState<'details' | 'media'>('details')

  const [meta, setMeta] = useState<TutorialMetadata>(emptyMeta)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Create-mode file state
  const [video, setVideo] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)

  // Edit-mode "replace files" state
  const [newVideo, setNewVideo] = useState<File | null>(null)
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null)
  const [removeThumbnail, setRemoveThumbnail] = useState(false)

  // Chunked-upload progress state
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  // When a video is picked, auto-fill the duration from its metadata.
  const pickVideo = (setter: (f: File | null) => void) => (f: File | null) => {
    setter(f)
    if (errors.video) setErrors((prev) => ({ ...prev, video: '' }))
    if (f) {
      readVideoDuration(f).then((d) => {
        if (d > 0) setField('duration_seconds', d)
      })
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setErrors({})
    setTab('details')
    setVideo(null)
    setThumbnail(null)
    setNewVideo(null)
    setNewThumbnail(null)
    setRemoveThumbnail(false)
    setUploading(false)
    setProgress(0)
    setUploadErr(null)
    abortRef.current = null
    if (tutorial) {
      setMeta({
        title: tutorial.title || '',
        description: tutorial.description || '',
        language: tutorial.language || 'en',
        visibility: tutorial.visibility || 'logged_in',
        category: tutorial.category || '',
        sort_order: tutorial.sort_order || 0,
        duration_seconds: tutorial.duration_seconds || 0,
        is_active: tutorial.is_active ?? true,
      })
    } else {
      setMeta(emptyMeta)
    }
  }, [isOpen, tutorial])

  // Object URLs for previewing freshly selected files
  const videoPreview = useMemo(() => {
    const f = isEdit ? newVideo : video
    return f ? URL.createObjectURL(f) : null
  }, [video, newVideo, isEdit])
  const thumbPreview = useMemo(() => {
    const f = isEdit ? newThumbnail : thumbnail
    return f ? URL.createObjectURL(f) : null
  }, [thumbnail, newThumbnail, isEdit])

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      if (thumbPreview) URL.revokeObjectURL(thumbPreview)
    }
  }, [videoPreview, thumbPreview])

  const setField = (name: keyof TutorialMetadata, value: any) => {
    setMeta((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateMeta = (): boolean => {
    const e: Record<string, string> = {}
    if (!meta.title.trim()) e.title = 'Title is required'
    if (meta.sort_order < 0) e.sort_order = 'Must be 0 or greater'
    if (meta.duration_seconds < 0) e.duration_seconds = 'Must be 0 or greater'
    if (!isEdit && !video) e.video = 'A video file is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Upload a video in chunks, returning its upload_id (null on cancel/failure).
  const chunkUpload = async (file: File): Promise<string | null> => {
    setUploadErr(null)
    setUploading(true)
    setProgress(0)
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const uploadId = await tutorialUploadService.uploadVideo(file, setProgress, ac.signal)
      return uploadId
    } catch (err: any) {
      const cancelled = err?.name === 'AbortError' || err?.name === 'CanceledError' || ac.signal.aborted
      setUploadErr(cancelled ? 'Upload cancelled.' : 'Video upload failed. Please try again.')
      return null
    } finally {
      setUploading(false)
      abortRef.current = null
    }
  }

  const cancelUpload = () => {
    abortRef.current?.abort()
  }

  const handleSubmitDetails = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (uploading) return
    if (!validateMeta()) return

    if (isEdit && tutorial) {
      // Details tab edits metadata only (files handled on the Media tab).
      onUpdate(tutorial.id, meta)
      return
    }

    // Create: chunk-upload the video first, then finalize with its upload_id.
    const uploadId = await chunkUpload(video as File)
    if (!uploadId) return
    onCreate({ ...meta, upload_id: uploadId, thumbnail })
  }

  const handleSubmitMedia = async () => {
    if (!tutorial || uploading) return
    if (!newVideo && !newThumbnail && !removeThumbnail) return

    let uploadId: string | undefined
    if (newVideo) {
      const id = await chunkUpload(newVideo)
      if (!id) return
      uploadId = id
    }
    onReplaceFiles(tutorial.id, {
      upload_id: uploadId,
      thumbnail: newThumbnail,
      remove_thumbnail: removeThumbnail,
    })
  }

  if (!isOpen) return null

  const existingThumb = resolveMediaUrl(tutorial?.thumbnail_url)
  const existingVideo = resolveMediaUrl(tutorial?.video_url)

  const FilePicker = ({
    kind,
    file,
    onPick,
    inputRef,
    accept,
  }: {
    kind: 'video' | 'thumbnail'
    file: File | null
    onPick: (f: File | null) => void
    inputRef: React.RefObject<HTMLInputElement>
    accept: string
  }) => (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-3 px-3 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-left"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
          {kind === 'video' ? <VideoCameraIcon className="w-5 h-5" /> : <PhotoIcon className="w-5 h-5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-800 truncate">
            {file ? file.name : `Choose ${kind} file`}
          </span>
          <span className="block text-[11px] text-slate-500">
            {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : accept.replace(/\//g, ' ')}
          </span>
        </span>
        {file && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onPick(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="ml-auto text-slate-400 hover:text-red-500"
            title="Clear"
          >
            <XMarkIcon className="w-4 h-4" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  )

  return (
    <>
    <SavingOverlay show={!!(isSaving)} label="Saving tutorial..." />
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Edit Tutorial' : 'Create New Tutorial'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs (edit mode only) */}
          {isEdit && (
            <div className="px-6 pt-3 border-b border-slate-200 flex gap-6 flex-shrink-0">
              <button
                onClick={() => setTab('details')}
                className={`pb-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  tab === 'details'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4" /> Details
              </button>
              <button
                onClick={() => setTab('media')}
                className={`pb-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  tab === 'media'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <VideoCameraIcon className="w-4 h-4" /> Media
              </button>
            </div>
          )}

          {apiError && (
            <div className="mx-6 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {apiError}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5 overflow-y-auto">
            {/* DETAILS (create form + edit details) */}
            {(!isEdit || tab === 'details') && (
              <form id="tutorial-details-form" onSubmit={handleSubmitDetails} className="space-y-4">
                <div>
                  <label className={labelCls}>
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={meta.title}
                    onChange={(e) => setField('title', e.target.value)}
                    className={`${inputCls} ${errors.title ? 'border-red-300 bg-red-50/50' : 'border-slate-300'}`}
                    placeholder="e.g. How to set a trading rule"
                  />
                  {errors.title && <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.title}</p>}
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    value={meta.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={3}
                    className={`${inputCls} border-slate-300 resize-none`}
                    placeholder="Short summary of what this tutorial covers"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Language</label>
                    <select
                      value={meta.language}
                      onChange={(e) => setField('language', e.target.value)}
                      className={`${inputCls} border-slate-300`}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Visibility</label>
                    <select
                      value={meta.visibility}
                      onChange={(e) => setField('visibility', e.target.value)}
                      className={`${inputCls} border-slate-300`}
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <input
                      type="text"
                      value={meta.category}
                      onChange={(e) => setField('category', e.target.value)}
                      className={`${inputCls} border-slate-300`}
                      placeholder="e.g. Rules"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Sort Order</label>
                      <input
                        type="number"
                        min={0}
                        value={meta.sort_order || ''}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10)
                          setField('sort_order', Number.isNaN(n) ? 0 : n)
                        }}
                        placeholder="0"
                        className={`${inputCls} ${errors.sort_order ? 'border-red-300' : 'border-slate-300'}`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Duration (s)</label>
                      <input
                        type="number"
                        min={0}
                        value={meta.duration_seconds || ''}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10)
                          setField('duration_seconds', Number.isNaN(n) ? 0 : n)
                        }}
                        placeholder="0"
                        className={`${inputCls} ${errors.duration_seconds ? 'border-red-300' : 'border-slate-300'}`}
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={meta.is_active}
                    onChange={(e) => setField('is_active', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </label>

                {/* File pickers — create mode only */}
                {!isEdit && (
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div>
                      <label className={labelCls}>
                        Video <span className="text-red-500">*</span>
                      </label>
                      <FilePicker
                        kind="video"
                        file={video}
                        onPick={pickVideo(setVideo)}
                        inputRef={videoInputRef}
                        accept="video/*"
                      />
                      {errors.video && <p className="mt-1 text-[10px] text-red-600 font-medium">⚠️ {errors.video}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Thumbnail (optional)</label>
                      <FilePicker
                        kind="thumbnail"
                        file={thumbnail}
                        onPick={setThumbnail}
                        inputRef={thumbInputRef}
                        accept="image/*"
                      />
                      {thumbPreview && (
                        <img src={thumbPreview} alt="thumbnail preview" className="mt-2 h-24 rounded-lg border border-slate-200 object-cover" />
                      )}
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* MEDIA (edit mode only) */}
            {isEdit && tab === 'media' && (
              <div className="space-y-5">
                {/* Current media */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={labelCls}>Current Video</p>
                    {existingVideo ? (
                      <video src={existingVideo} controls className="w-full rounded-lg border border-slate-200 bg-black max-h-44" />
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                        No video
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={labelCls}>Current Thumbnail</p>
                    {existingThumb ? (
                      <img src={existingThumb} alt="current thumbnail" className="w-full max-h-44 rounded-lg border border-slate-200 object-cover" />
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                        No thumbnail
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Replace files</p>
                  <div>
                    <label className={labelCls}>New Video</label>
                    <FilePicker kind="video" file={newVideo} onPick={pickVideo(setNewVideo)} inputRef={videoInputRef} accept="video/*" />
                  </div>
                  <div>
                    <label className={labelCls}>New Thumbnail</label>
                    <FilePicker
                      kind="thumbnail"
                      file={newThumbnail}
                      onPick={(f) => {
                        setNewThumbnail(f)
                        if (f) setRemoveThumbnail(false)
                      }}
                      inputRef={thumbInputRef}
                      accept="image/*"
                    />
                    {thumbPreview && (
                      <img src={thumbPreview} alt="new thumbnail preview" className="mt-2 h-24 rounded-lg border border-slate-200 object-cover" />
                    )}
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={removeThumbnail}
                      disabled={!!newThumbnail}
                      onChange={(e) => setRemoveThumbnail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-2 focus:ring-red-500/30 disabled:opacity-40"
                    />
                    <span className="text-sm font-medium text-slate-700">Remove current thumbnail</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Upload progress / error */}
          {(uploading || uploadErr) && (
            <div className="px-6 pt-3 flex-shrink-0">
              {uploading && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="font-medium">Uploading video…</span>
                    <span>{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-[width] duration-200"
                      style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
                    />
                  </div>
                  <button
                    onClick={cancelUpload}
                    className="mt-1.5 text-[11px] font-medium text-red-600 hover:underline"
                  >
                    Cancel upload
                  </button>
                </div>
              )}
              {uploadErr && !uploading && (
                <p className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{uploadErr}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0 bg-white">
            <button
              onClick={onClose}
              disabled={isSaving || uploading}
              className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {(!isEdit || tab === 'details') ? (
              <button
                type="submit"
                form="tutorial-details-form"
                disabled={isSaving || uploading}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {(isSaving || uploading) && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {uploading
                  ? `Uploading ${Math.round(progress * 100)}%`
                  : isSaving
                  ? 'Saving…'
                  : isEdit
                  ? 'Save Details'
                  : 'Create Tutorial'}
              </button>
            ) : (
              <button
                onClick={handleSubmitMedia}
                disabled={isSaving || uploading || (!newVideo && !newThumbnail && !removeThumbnail)}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {(isSaving || uploading) && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {uploading ? `Uploading ${Math.round(progress * 100)}%` : isSaving ? 'Saving…' : 'Update Files'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  )
}

export default TutorialModal
