import React, { useState, useEffect, useMemo } from 'react'
import Loader from '../components/ui/Loader'
import { useQuery } from 'react-query'
import { 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { CommandLineIcon } from '@heroicons/react/24/solid'
import { logsService, LogContentResponse } from '../services/logsService'
import toast from 'react-hot-toast'
import PageHeaderShell from '../components/layout/PageHeaderShell'

const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'mt5'>('system')
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [isTailMode, setIsTailMode] = useState(false)
  const [logContent, setLogContent] = useState<LogContentResponse | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  // Fetch log files list
  const { data: logFiles, isLoading: isLoadingFiles, refetch } = useQuery(
    ['logs-list'],
    () => logsService.listLogs(),
    {
      refetchOnWindowFocus: false,
      retry: false,
      onError: (error: any) => {
        // Check if it's a 403 Forbidden error
        if (error?.response?.status === 403) {
          setAccessDenied(true)
          toast.error('Access Denied: You do not have permission to view logs')
          return
        }
        
        const errorMsg = error?.response?.data?.message || error?.message || 'Failed to load log files'
        toast.error(`Logs API Error: ${errorMsg}`)
        console.error('Logs API error:', {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          url: error?.config?.url,
          data: error?.response?.data,
          error
        })
      }
    }
  )

  // Auto-select first file when tab changes
  useEffect(() => {
    if (logFiles) {
      const files = activeTab === 'system' ? logFiles.system_logs : logFiles.mt5_logs
      if (files && files.length > 0 && !selectedFile) {
        setSelectedFile(files[0].filename)
      }
    }
  }, [activeTab, logFiles, selectedFile])

  // Fetch log content
  const fetchLogContent = async () => {
    if (!selectedFile) return

    setIsLoadingContent(true)
    try {
      const params = {
        offset: isTailMode ? undefined : offset,
        limit,
        tail: isTailMode || undefined,
        search: searchTerm || undefined,
        regex: isRegex || undefined
      }

      const content = activeTab === 'system'
        ? await logsService.getSystemLog(selectedFile, params)
        : await logsService.getMT5Log(selectedFile, params)

      setLogContent(content)
    } catch (error: any) {
      toast.error('Failed to fetch log content')
      console.error(error)
    } finally {
      setIsLoadingContent(false)
    }
  }

  useEffect(() => {
    if (selectedFile) {
      fetchLogContent()
    }
  }, [selectedFile, offset, limit, isTailMode])

  const handleSearch = () => {
    setOffset(0)
    setCurrentPage(1)
    fetchLogContent()
  }

  const handleTabChange = (tab: 'system' | 'mt5') => {
    setActiveTab(tab)
    setSelectedFile('')
    setLogContent(null)
    setOffset(0)
    setCurrentPage(1)
    setSearchTerm('')
    setIsTailMode(false)
  }

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * limit
    setCurrentPage(page)
    setOffset(newOffset)
  }

  const handleRefresh = async () => {
    await refetch()
    await fetchLogContent()
    toast.success('Logs refreshed!')
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setOffset(0)
    setCurrentPage(1)
  }

  // Fixed pagination options
  const paginationOptions = useMemo(() => {
    const baseOptions = [10, 25, 50, 100]
    if (logContent && logContent.total_lines > 0) {
      // Only keep options <= total lines, plus an "All" entry
      const filtered = baseOptions.filter((n) => n < logContent.total_lines)
      return [...filtered, logContent.total_lines]
    }
    return baseOptions
  }, [logContent?.total_lines])

  const currentFiles = logFiles && logFiles[activeTab === 'system' ? 'system_logs' : 'mt5_logs'] || []

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`
  }

  // const formatDate = (timestamp: number) => {
  //   return new Date(timestamp * 1000).toLocaleString()
  // }

  // Show Access Denied UI if 403 error
  if (accessDenied) {
    return (
      <div className="h-screen bg-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            You don't have permission to access system logs.
            <br />
            This module requires the <span className="font-semibold text-slate-900">system.admin</span> permission.
            <br />
            Please contact your administrator to request access.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <PageHeaderShell sticky>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center">
                  <CommandLineIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">System Logs</h1>
                  <p className="text-sm text-slate-500">View and search system and MT5 log files</p>
                </div>
              </div>

              <div />
            </div>
      </PageHeaderShell>

      {/* Main Content */}
      <main className="px-2 pt-3 pb-4">
        {/* Unified Console Card: controls + log viewer all in one black panel */}
        <div className="mt-4 bg-black rounded-xl shadow-sm border border-slate-700 p-4 space-y-3">
          {/* Row 1: Log file + tabs/actions */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr] gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Log File</label>
              <select
                value={selectedFile}
                onChange={(e) => {
                  setSelectedFile(e.target.value)
                  setOffset(0)
                }}
                className="w-full px-3 py-2 text-sm border border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-transparent bg-slate-900 text-slate-100"
                disabled={isLoadingFiles}
              >
                <option value="">-- Select File --</option>
                {currentFiles.map((file) => (
                  <option key={file.filename} value={file.filename}>
                    {file.filename} ({formatFileSize(file.size)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
              <button
                onClick={() => handleTabChange('system')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap border ${
                  activeTab === 'system'
                    ? 'bg-slate-800 border-slate-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                System ({logFiles?.system_logs?.length || 0})
              </button>
              <button
                onClick={() => handleTabChange('mt5')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap border ${
                  activeTab === 'mt5'
                    ? 'bg-slate-800 border-slate-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                MT5 ({logFiles?.mt5_logs?.length || 0})
              </button>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:bg-slate-800 font-medium text-sm group"
                title="Refresh logs"
              >
                <ArrowPathIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search + options */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Search Logs</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-transparent bg-slate-900 text-slate-100 placeholder-slate-500"
                />
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRegex}
                  onChange={(e) => setIsRegex(e.target.checked)}
                  className="w-4 h-4 text-slate-700 border-slate-600 rounded focus:ring-slate-500 bg-slate-900"
                />
                <span className="ml-2 text-sm text-slate-300">Regex</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTailMode}
                  onChange={(e) => setIsTailMode(e.target.checked)}
                  className="w-4 h-4 text-slate-700 border-slate-600 rounded focus:ring-slate-500 bg-slate-900"
                />
                <span className="ml-2 text-sm text-slate-300">Tail</span>
              </label>
              <button
                onClick={handleSearch}
                disabled={isLoadingContent}
                className="px-4 py-2 text-sm bg-slate-900 border border-slate-700 text-slate-200 rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>

          {/* Row 3: Pagination Controls (only when applicable) */}
          {!isTailMode && logContent && logContent.total_lines > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-700">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Lines per page:</span>
                <select
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-slate-900 text-slate-100 text-xs"
                >
                  {paginationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === logContent.total_lines ? 'All' : option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-300">
                Showing {offset + 1} to {Math.min(offset + logContent.returned_lines, logContent.total_lines)} of {logContent.total_lines} lines
              </div>

              {Math.ceil(logContent.total_lines / limit) > 1 && (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoadingContent}
                    className="px-2 py-1 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-slate-300">
                    Page {currentPage} of {Math.ceil(logContent.total_lines / limit)}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(logContent.total_lines / limit) || isLoadingContent}
                    className="px-2 py-1 border border-slate-700 rounded-md hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Log Content */}
          <div className="rounded-lg p-3 min-h-[320px] max-h-[320px] overflow-auto border border-slate-800 bg-black">
            {isLoadingContent ? (
              <Loader label="Loading logs..." />
            ) : logContent && logContent.lines.length > 0 ? (
              <pre className="text-xs text-yellow-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {logContent.lines.map((line, index) => (
                  <div key={index} className="hover:bg-slate-800 transition-colors">
                    {line}
                  </div>
                ))}
              </pre>
            ) : selectedFile ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                No log content available
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                Select a log file to view its content
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Logs

