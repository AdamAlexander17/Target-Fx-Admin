import React, { useMemo, useState } from 'react'
import SavingOverlay from '../components/ui/SavingOverlay'
import Loader from '../components/ui/Loader'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import PageHeaderShell from '../components/layout/PageHeaderShell'
import ConfirmationDialog from '../components/ui/ConfirmationDialog'
import {
  settlementWeeksService,
  SettlementWeek,
  CreateSettlementWeekData,
} from '../services/settlementWeeksService'

// ─── Helpers ─────────────────────────────────────────────────────────
const toIsoDate = (d: string | undefined): string => {
  if (!d) return ''
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

const fmtDate = (d: string | undefined): string => {
  const iso = toIsoDate(d)
  if (!iso) return '—'
  const [y, mo, da] = iso.split('-')
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${da} ${months[Number(mo) - 1]} ${y}`
}

// ─── Modal: Create / Edit (matches UserModal style) ───────────────────
interface FormState {
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  is_current: boolean
}

const blankForm: FormState = {
  name: '',
  start_date: '',
  end_date: '',
  is_active: true,
  is_current: false,
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateSettlementWeekData) => void
  isSaving: boolean
  initial?: SettlementWeek | null
}

const SettlementWeekModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSaving,
  initial,
}) => {
  const [form, setForm] = useState<FormState>(blankForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        name: initial.name ?? '',
        start_date: toIsoDate(initial.start_date),
        end_date: toIsoDate(initial.end_date),
        is_active: initial.is_active ?? true,
        is_current: initial.is_current ?? false,
      })
    } else {
      setForm(blankForm)
    }
    setErrors({})
  }, [isOpen, initial])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.start_date) e.start_date = 'Start date is required'
    if (!form.end_date) e.end_date = 'End date is required'
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      e.end_date = 'End date must be after start date'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    const payload: CreateSettlementWeekData = {
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: form.is_active,
      is_current: form.is_current,
    }
    onSubmit(payload)
  }

  const isEdit = !!initial

  return (
    <>
    <SavingOverlay show={!!(isSaving)} label="Saving settlement week..." />
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl bg-white"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-300">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEdit ? 'Edit Settlement Week' : 'Create Settlement Week'}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {isEdit
                    ? 'Update the brokerage settlement period'
                    : 'Define a brokerage settlement period'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-blue-100 transition-all"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[520px] bg-white">
              <form id="settlement-week-form" onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="px-6 py-4">
                  <div className="flex items-center mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Basic Information
                    </h3>
                  </div>

                  {/* Name */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Week 16-23 - 2026"
                      className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                        errors.name
                          ? 'border-red-300 bg-red-50/50'
                          : 'border-slate-300 bg-white text-slate-900'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-[10px] text-red-600 font-medium">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(e) =>
                          setForm({ ...form, start_date: e.target.value })
                        }
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                          errors.start_date
                            ? 'border-red-300 bg-red-50/50'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      />
                      {errors.start_date && (
                        <p className="mt-1 text-[10px] text-red-600 font-medium">
                          {errors.start_date}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) =>
                          setForm({ ...form, end_date: e.target.value })
                        }
                        className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-300 transition-all ${
                          errors.end_date
                            ? 'border-red-300 bg-red-50/50'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      />
                      {errors.end_date && (
                        <p className="mt-1 text-[10px] text-red-600 font-medium">
                          {errors.end_date}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status flags */}
                <div className="px-6 py-3 border-t border-slate-200 space-y-2.5">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({ ...form, is_active: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_current}
                      onChange={(e) =>
                        setForm({ ...form, is_current: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
                    />
                    <span>Current Week</span>
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-300 bg-white flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-sm border-2 rounded-lg transition-all duration-200 font-medium border-slate-300 text-slate-700 hover:bg-white"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="settlement-week-form"
                disabled={isSaving}
                className="px-5 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm"
              >
                {isSaving ? (
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>{isEdit ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <span>{isEdit ? 'Update Week' : 'Create Week'}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}

// ─── Main page ───────────────────────────────────────────────────────
const paginationOptions = [10, 25, 50, 100]

const SettlementWeeks: React.FC = () => {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<SettlementWeek | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SettlementWeek | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')

  // ── Queries / mutations ────────────────────────────────────────────
  const { data: weeks = [], isLoading, refetch, isFetching } = useQuery(
    ['settlement-weeks'],
    () => settlementWeeksService.list(),
    {
      retry: false,
      onError: () => toast.error('Failed to load settlement weeks'),
    }
  )

  const createMutation = useMutation(
    (data: CreateSettlementWeekData) => settlementWeeksService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['settlement-weeks'])
        setIsModalOpen(false)
        setEditing(null)
        toast.success('Settlement week created')
      },
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.message ?? 'Failed to create settlement week'
        )
      },
    }
  )

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: CreateSettlementWeekData }) =>
      settlementWeeksService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['settlement-weeks'])
        setIsModalOpen(false)
        setEditing(null)
        toast.success('Settlement week updated')
      },
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.message ?? 'Failed to update settlement week'
        )
      },
    }
  )

  const deleteMutation = useMutation(
    (id: number) => settlementWeeksService.remove(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['settlement-weeks'])
        setDeleteTarget(null)
        toast.success('Settlement week deleted')
      },
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.message ?? 'Failed to delete settlement week'
        )
      },
    }
  )

  const handleSubmit = (data: CreateSettlementWeekData) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (w: SettlementWeek) => {
    setEditing(w)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditing(null)
    setIsModalOpen(true)
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortOrder('ASC')
    }
  }

  // ── Derived data ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return weeks
    return weeks.filter(
      (w) =>
        (w.name ?? '').toLowerCase().includes(q) ||
        toIsoDate(w.start_date).includes(q) ||
        toIsoDate(w.end_date).includes(q) ||
        String(w.week_number ?? '').includes(q)
    )
  }, [weeks, search])

  const sorted = useMemo(() => {
    if (!sortField) return filtered
    return [...filtered].sort((a, b) => {
      let av: any = a[sortField as keyof SettlementWeek]
      let bv: any = b[sortField as keyof SettlementWeek]
      if (sortField === 'start_date' || sortField === 'end_date') {
        av = toIsoDate(av as string)
        bv = toIsoDate(bv as string)
      }
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sortOrder === 'ASC' ? -1 : 1
      if (av > bv) return sortOrder === 'ASC' ? 1 : -1
      return 0
    })
  }, [filtered, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = useMemo(
    () =>
      sorted.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage),
    [sorted, safePage, itemsPerPage]
  )

  const isSaving = createMutation.isLoading || updateMutation.isLoading

  // Only show optional columns when at least one row actually has that field
  const hasWeekNumber = useMemo(
    () => weeks.some((w) => w.week_number != null),
    [weeks]
  )
  const hasStatus = useMemo(
    () => weeks.some((w) => w.is_active !== undefined || w.is_current === true),
    [weeks]
  )
  const columnCount = 3 + (hasWeekNumber ? 1 : 0) + (hasStatus ? 1 : 0) + 1

  const SortArrow: React.FC<{ field: string }> = ({ field }) =>
    sortField === field ? (
      <span className="text-slate-700">
        {sortOrder === 'ASC' ? '↑' : '↓'}
      </span>
    ) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white">
      <PageHeaderShell>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center flex-shrink-0">
              <CalendarDaysIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                Settlement Management
              </h1>
              <p className="text-xs font-medium text-slate-500 truncate">
                Manage brokerage settlement periods efficiently
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:flex-nowrap">
            <button
              onClick={() => refetch()}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center gap-1.5 text-sm shadow-sm hover:bg-slate-50 group"
              title="Refresh"
            >
              <ArrowPathIcon
                className={`w-4 h-4 transition-transform duration-300 ${
                  isFetching ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 text-sm font-semibold shadow-sm group"
            >
              <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span>Create Week</span>
            </button>
          </div>
        </div>
      </PageHeaderShell>

      {/* Main content */}
      <main className="px-2 pt-3 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
            {/* Top bar: search + entries + pagination */}
            <div className="p-3 border-b border-slate-300">
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search settlement weeks..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-sm bg-white text-slate-900 placeholder-slate-400"
                  />
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs bg-white text-slate-900"
                    >
                      {paginationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-600">entries</span>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={safePage === 1}
                        className="px-2 py-1 border border-slate-300 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <span className="text-xs text-slate-700">
                        Page {safePage} of {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={safePage === totalPages}
                        className="px-2 py-1 border border-slate-300 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto no-scrollbar max-h-[calc(100vh-220px)]">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-white border-b border-slate-300">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors text-slate-700 hover:bg-slate-50"
                      title="Click to sort"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Name</span>
                        <SortArrow field="name" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('start_date')}
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors text-slate-700 hover:bg-slate-50"
                      title="Click to sort"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Start Date</span>
                        <SortArrow field="start_date" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('end_date')}
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors text-slate-700 hover:bg-slate-50"
                      title="Click to sort"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>End Date</span>
                        <SortArrow field="end_date" />
                      </div>
                    </th>
                    {hasWeekNumber && (
                      <th
                        onClick={() => handleSort('week_number')}
                        className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors text-slate-700 hover:bg-slate-50"
                        title="Click to sort"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Week #</span>
                          <SortArrow field="week_number" />
                        </div>
                      </th>
                    )}
                    {hasStatus && (
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-700">
                        Status
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={columnCount} className="px-4 py-6 text-center">
                        <Loader label="Loading settlement weeks..." />
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-4 py-16 text-center text-slate-500"
                      >
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-50">
                          <CalendarDaysIcon className="w-10 h-10 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold mb-1 text-slate-900">
                          No settlement weeks found
                        </h3>
                        <p className="font-medium text-slate-600 text-sm">
                          {search
                            ? 'Try adjusting your search.'
                            : 'Get started by creating your first settlement week.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((w) => (
                      <tr
                        key={w.id}
                        className="transition-colors duration-150 hover:bg-white"
                      >
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-slate-200">
                              <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-900">
                              {w.name ?? `Week #${w.id}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="text-sm text-slate-700">
                            {fmtDate(w.start_date)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="text-sm text-slate-700">
                            {fmtDate(w.end_date)}
                          </p>
                        </td>
                        {hasWeekNumber && (
                          <td className="px-4 py-3 text-center">
                            {w.week_number != null ? (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                {w.week_number}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {hasStatus && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {w.is_current === true && (
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-slate-200">
                                  Current
                                </span>
                              )}
                              {w.is_active !== undefined && (
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    w.is_active
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {w.is_active ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(w)}
                              className="group/btn relative p-1.5 text-blue-600 hover:text-white rounded-lg bg-blue-50 hover:bg-blue-700 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/50 hover:scale-110"
                              title="Edit settlement week"
                            >
                              <svg
                                className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(w)}
                              className="group/btn relative p-1.5 text-red-500 hover:text-white rounded-lg bg-blue-50 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:shadow-md hover:shadow-red-500/50 hover:scale-110"
                              title="Delete settlement week"
                            >
                              <svg
                                className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </main>

      <SettlementWeekModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        initial={editing}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        title="Delete Settlement Week"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${
                deleteTarget.name ?? `Week #${deleteTarget.id}`
              }"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isLoading}
      />
    </div>
  )
}

export default SettlementWeeks
