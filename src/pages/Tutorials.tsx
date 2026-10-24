import React, { useState, useRef } from 'react'
import Loader from '../components/ui/Loader'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlayCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  VideoCameraIcon,
  PhotoIcon,
  XMarkIcon,
  TagIcon,
  GlobeAltIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { AcademicCapIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import {
  tutorialService,
  Tutorial,
  CreateTutorialInput,
  UpdateTutorialData,
  ReplaceFilesInput,
  resolveMediaUrl,
} from '../services/tutorialService'
import TutorialModal from '../components/TutorialModal'
import ConfirmationDialog from '../components/ui/ConfirmationDialog'
import { PermissionGate } from '../components/PermissionGate'
import { MODULES } from '../utils/permissions'
import PageHeaderShell from '../components/layout/PageHeaderShell'

const formatDuration = (s: number): string => {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// Display full language name — prefer the backend's language_name, else map the code.
const LANG_NAMES: Record<string, string> = { hi: 'Hindi', gu: 'Gujarati', en: 'English' }
const languageLabel = (t: Tutorial): string =>
  t.language_name || LANG_NAMES[(t.language || '').toLowerCase()] || t.language || '—'

const visibilityLabel = (v: string): string =>
  v === 'logged_in' ? 'Logged in' : v === 'public' ? 'Public' : v || '—'

const Tutorials: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState<Tutorial | null>(null)
  const [toDelete, setToDelete] = useState<Tutorial | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [preview, setPreview] = useState<Tutorial | null>(null)
  const previewRetriedRef = useRef(false)

  const queryClient = useQueryClient()

  const { data: tutorials = [], isLoading, refetch } = useQuery(
    'tutorials',
    () => tutorialService.getTutorials(),
    {
      onError: (error: any) =>
        toast.error(error?.response?.data?.message || 'Failed to fetch tutorials'),
    }
  )

  const errMsg = (error: any, fallback: string) => {
    // Timed-out request (common for large video uploads)
    if (error?.code === 'ECONNABORTED') {
      return 'Upload timed out — the video may be too large or the connection too slow.'
    }
    // Request sent but no response (network / CORS / server down)
    if (!error?.response) {
      return 'No response from server (possible network, CORS, or upload-size limit).'
    }
    const status = error.response.status
    const serverMsg = error.response.data?.error || error.response.data?.message
    if (status === 413) {
      return 'File too large — the server rejected the upload (413). Increase the server/proxy upload-size limit.'
    }
    return serverMsg ? `${fallback}: ${serverMsg} (HTTP ${status})` : `${fallback} (HTTP ${status})`
  }

  const createMutation = useMutation(
    (input: CreateTutorialInput) => tutorialService.createTutorial(input),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tutorials')
        closeModal()
        toast.success('Tutorial created successfully')
      },
      onError: (error: any) => {
        const m = errMsg(error, 'Failed to create tutorial')
        setApiError(m)
        toast.error(m)
      },
    }
  )

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: UpdateTutorialData }) => tutorialService.updateTutorial(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tutorials')
        closeModal()
        toast.success('Tutorial updated successfully')
      },
      onError: (error: any) => {
        const m = errMsg(error, 'Failed to update tutorial')
        setApiError(m)
        toast.error(m)
      },
    }
  )

  const filesMutation = useMutation(
    ({ id, input }: { id: number; input: ReplaceFilesInput }) => tutorialService.replaceFiles(id, input),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tutorials')
        closeModal()
        toast.success('Tutorial files updated')
      },
      onError: (error: any) => {
        const m = errMsg(error, 'Failed to update files')
        setApiError(m)
        toast.error(m)
      },
    }
  )

  const deleteMutation = useMutation((id: number) => tutorialService.deleteTutorial(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('tutorials')
      setToDelete(null)
      toast.success('Tutorial deleted')
    },
    onError: (error: any) => {
      toast.error(errMsg(error, 'Failed to delete tutorial'))
    },
  })

  const openCreate = () => {
    setSelected(null)
    setApiError(null)
    setIsModalOpen(true)
  }
  const openEdit = (t: Tutorial) => {
    setSelected(t)
    setApiError(null)
    setIsModalOpen(true)
  }
  const closeModal = () => {
    setIsModalOpen(false)
    setSelected(null)
    setApiError(null)
  }

  const handleRefresh = () => {
    refetch()
    toast.success('Tutorials refreshed')
  }

  const openPreview = (t: Tutorial) => {
    previewRetriedRef.current = false
    setPreview(t)
  }

  // A `logged_in` video URL carries a short-lived token; if it has expired the
  // <video> errors. Refetch once to get a fresh URL and reopen the player.
  const handlePreviewError = async () => {
    if (previewRetriedRef.current || !preview) return
    previewRetriedRef.current = true
    const res = await refetch()
    const fresh = res.data?.find((x) => x.id === preview.id)
    if (fresh) setPreview(fresh)
  }

  const term = searchTerm.trim().toLowerCase()
  const filtered = term
    ? tutorials.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.category.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      )
    : tutorials

  const isSaving = createMutation.isLoading || updateMutation.isLoading || filesMutation.isLoading

  return (
    <div className="min-h-screen bg-white font-sans">
      <PageHeaderShell>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
              <AcademicCapIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                Tutorials
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Manage tutorial videos shown to users ({tutorials.length} tutorials)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm text-sm group hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowPathIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
              <span>Refresh</span>
            </button>
            <PermissionGate module={MODULES.TUTORIALS} action="create">
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm font-semibold text-sm group"
              >
                <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                <span>Create Tutorial</span>
              </button>
            </PermissionGate>
          </div>
        </div>
      </PageHeaderShell>

      <main className="px-2 pt-3 pb-6">
        {/* Search */}
        <div className="mb-4 relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by title, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white text-slate-900 placeholder-slate-400"
          />
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        </div>

        {/* Loading */}
        {isLoading ? (
          <Loader label="Loading tutorials..." />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <VideoCameraIcon className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No tutorials found</p>
            <p className="text-xs text-slate-500 mt-1">
              {term ? 'Try a different search term.' : 'Create your first tutorial to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t) => {
              const thumb = resolveMediaUrl(t.thumbnail_url)
              return (
                <div
                  key={t.id}
                  className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Thumbnail with overlays */}
                  <div className="relative aspect-video w-full bg-slate-900/90 overflow-hidden">
                    {/* Clickable preview layer */}
                    <button
                      onClick={() => openPreview(t)}
                      className="absolute inset-0 w-full h-full flex items-center justify-center"
                      title="Play video"
                    >
                      {thumb ? (
                        <img src={thumb} alt={t.title} className="w-full h-full object-cover" />
                      ) : (
                        <PhotoIcon className="w-10 h-10 text-slate-500" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircleIcon className="w-12 h-12 text-white drop-shadow" />
                      </span>
                    </button>

                    {/* Duration (bottom-right) */}
                    <span className="absolute bottom-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-medium text-white">
                      {formatDuration(t.duration_seconds)}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{t.title || 'Untitled'}</h3>
                      <span
                        className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {t.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.description}</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium">
                          <TagIcon className="w-3 h-3" />
                          {t.category}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-medium">
                        <GlobeAltIcon className="w-3 h-3" />
                        {languageLabel(t)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                        <EyeIcon className="w-3 h-3" />
                        {visibilityLabel(t.visibility)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                      <PermissionGate module={MODULES.TUTORIALS} action="edit">
                        <button
                          onClick={() => openEdit(t)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                      <PermissionGate module={MODULES.TUTORIALS} action="delete">
                        <button
                          onClick={() => setToDelete(t)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Create / Edit modal */}
      <TutorialModal
        isOpen={isModalOpen}
        onClose={closeModal}
        tutorial={selected}
        onCreate={(input) => createMutation.mutate(input)}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
        onReplaceFiles={(id, input) => filesMutation.mutate({ id, input })}
        isSaving={isSaving}
        apiError={apiError}
      />

      {/* Delete confirm */}
      <ConfirmationDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
        title="Delete Tutorial"
        message={`Are you sure you want to delete "${toDelete?.title || 'this tutorial'}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteMutation.isLoading}
      />

      {/* Video preview — compact 9:16 phone frame, reel fills it edge-to-edge */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative h-[88vh] max-h-[88vh] aspect-[9/16] max-w-[95vw] rounded-3xl overflow-hidden shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title overlay (top) */}
            <div className="absolute top-0 inset-x-0 z-10 p-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
              <p className="text-white text-sm font-semibold truncate pr-10">{preview.title}</p>
            </div>
            {/* Close button */}
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2.5 right-2.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            {resolveMediaUrl(preview.video_url) ? (
              <video
                src={resolveMediaUrl(preview.video_url) as string}
                poster={resolveMediaUrl(preview.thumbnail_url) || undefined}
                controls
                autoPlay
                playsInline
                // metadata preload + HTTP Range (206) streaming = fast start,
                // no full-file download; poster shows instantly.
                preload="metadata"
                onError={handlePreviewError}
                // object-cover + 9:16 frame → the reel fills the whole phone
                // frame with no black bars on the sides.
                className="h-full w-full object-cover bg-black"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-sm text-slate-300">
                No video available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Tutorials
