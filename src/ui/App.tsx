import { useCallback, useEffect, useState } from 'react'
import type { ScanResultMessage, UIMessage, UnlinkedInstance } from '../types'

function App() {
  const [scope, setScope] = useState<'current-page' | 'entire-document'>('current-page')
  const [instances, setInstances] = useState<UnlinkedInstance[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scan for unlinked instances on mount
  useEffect(() => {
    setIsScanning(true)
    parent.postMessage({ pluginMessage: { type: 'scan', scope } }, '*')
  }, [scope])

  // Handle scope change - rescan when scope changes
  const handleScopeChange = useCallback(() => {
    const newScope = scope === 'current-page' ? 'entire-document' : 'current-page'
    setScope(newScope)
    setIsScanning(true)
    setInstances([])
    setSelectedIds(new Set())
    setError(null)

    parent.postMessage({ pluginMessage: { type: 'scan', scope: newScope } }, '*')
  }, [scope])

  // Listen for messages from plugin
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as UIMessage

      if (msg.type === 'scan-result') {
        const scanResult = msg as ScanResultMessage
        setInstances(scanResult.instances)
        setIsScanning(false)

        // Auto-select instances that have matches
        const withMatches = new Set(
          scanResult.instances.filter((inst) => inst.matchedComponentId !== null).map((inst) => inst.instanceId),
        )
        setSelectedIds(withMatches)
      } else if (msg.type === 'replace-complete') {
        setIsScanning(false)
        // Plugin will close itself
      } else if (msg.type === 'error') {
        setError(msg.message)
        setIsScanning(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleCheckboxChange = useCallback((instanceId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(instanceId)
      } else {
        next.delete(instanceId)
      }
      return next
    })
  }, [])

  const handleReplace = useCallback(() => {
    if (selectedIds.size === 0) return

    parent.postMessage({ pluginMessage: { type: 'replace', instanceIds: Array.from(selectedIds) } }, '*')
  }, [selectedIds])

  const handleCancel = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')
  }, [])

  const handleSelect = useCallback((instanceId: string) => {
    parent.postMessage({ pluginMessage: { type: 'select', instanceId } }, '*')
  }, [])

  const handleCheckAll = useCallback(() => {
    const allMatchedIds = new Set(
      instances.filter((inst) => inst.matchedComponentId !== null).map((inst) => inst.instanceId),
    )
    setSelectedIds(allMatchedIds)
  }, [instances])

  const handleUncheckAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleRefresh = useCallback(() => {
    setIsScanning(true)
    setInstances([])
    setSelectedIds(new Set())
    setError(null)
    parent.postMessage({ pluginMessage: { type: 'scan', scope } }, '*')
  }, [scope])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">Scan scope:</span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isScanning}
              className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              title="Refresh scan"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 15 15">
                <path
                  fill="currentColor"
                  d="M7.5.85c3.164 0 4.794 2.219 5.5 3.46v.002V2.5a.5.5 0 1 1 1 0v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1h1.733l-.112-.208c-.64-1.126-2.01-2.942-4.62-2.942c-3.44 0-5.651 2.815-5.651 5.65s2.21 5.65 5.65 5.65c1.665 0 3.03-.654 4.001-1.643l.192-.204a5.8 5.8 0 0 0 1.024-1.642l.048-.09a.5.5 0 0 1 .877.47l-.13.296a6.8 6.8 0 0 1-1.072 1.631l-.226.24c-1.152 1.173-2.77 1.942-4.714 1.942c-4.062 0-6.65-3.335-6.65-6.65C.85 4.186 3.438.85 7.5.85"
                ></path>
              </svg>
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs">{scope === 'current-page' ? 'Current page' : 'Entire document'}</span>
            <input
              type="checkbox"
              checked={scope === 'entire-document'}
              onChange={handleScopeChange}
              disabled={isScanning}
              className="w-8 h-5 appearance-none bg-gray-300 rounded-full relative cursor-pointer transition-colors checked:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundImage:
                  scope === 'entire-document'
                    ? 'radial-gradient(circle at 22px 10px, white 6px, transparent 6px)'
                    : 'radial-gradient(circle at 6px 10px, white 6px, transparent 6px)',
              }}
            />
          </label>
        </div>

        {error && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mb-3">
            ⚠️ {error}
          </div>
        )}

        {isScanning && <div className="text-xs text-gray-500">Scanning for unlinked components...</div>}

        {!isScanning && instances.length === 0 && (
          <div className="text-xs text-gray-500">No unlinked component instances found.</div>
        )}

        {!isScanning && instances.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">
              Found {instances.length} unlinked instance{instances.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleCheckAll}
                className="px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Check all
              </button>
              <button
                type="button"
                onClick={handleUncheckAll}
                className="px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Uncheck all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable list of instances */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {instances.map((instance) => (
          <div key={instance.instanceId} className="p-3 border-b border-gray-100 hover:bg-gray-50">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => handleCheckboxChange(instance.instanceId, !selectedIds.has(instance.instanceId))}
                disabled={instance.matchedComponentId === null}
                className="mt-0.5 w-4 h-4 flex-shrink-0 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  backgroundColor: selectedIds.has(instance.instanceId) ? '#0d99ff' : 'white',
                  border: '1.5px solid',
                  borderColor: selectedIds.has(instance.instanceId) ? '#0d99ff' : '#999',
                }}
                aria-label="Select instance"
              >
                {selectedIds.has(instance.instanceId) && (
                  <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 15 15">
                    <path
                      fill="white"
                      d="M10.602 3.908a.626.626 0 0 1 1.046.684l-4.25 6.5a.626.626 0 0 1-.944.12l-2.75-2.5l-.084-.094a.626.626 0 0 1 .823-.906l.103.075l2.207 2.006z"
                    ></path>
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium truncate flex-1">{instance.instanceName}</div>
                  <button
                    type="button"
                    onClick={() => handleSelect(instance.instanceId)}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Select in Figma"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M14.3548 5.64083L14.4191 5.71886C14.5471 5.91292 14.5256 6.17713 14.3548 6.34794C14.184 6.51875 13.9198 6.54018 13.7258 6.41216L13.6477 6.34794L12.0001 4.70033L4.70393 11.9965L12.0001 19.2927L19.2963 11.9965L17.6494 10.3496C17.4541 10.1543 17.4541 9.83774 17.6494 9.64248C17.8446 9.44721 18.1612 9.44721 18.3565 9.64248L20.357 11.643C20.5522 11.8382 20.5522 12.1548 20.357 12.3501L12.3537 20.3533C12.1584 20.5486 11.8418 20.5486 11.6466 20.3533L3.64327 12.3501C3.44801 12.1548 3.44801 11.8382 3.64327 11.643L11.6466 3.63966L11.7246 3.57545C11.9187 3.44715 12.1828 3.46875 12.3537 3.63966L14.3548 5.64083Z"
                        fill="currentColor"
                      />
                      <path
                        d="M15.0005 4.00015C15.0005 3.72401 15.2243 3.5002 15.5004 3.5002L20 3.5002C20.2761 3.5002 20.4999 3.72401 20.4999 4.00015V8.49967C20.4999 8.77581 20.2761 8.99961 20 8.99961C19.7239 8.99953 19.5 8.77576 19.5 8.49967V5.2072L12.3537 12.3535C12.1584 12.5488 11.8418 12.5488 11.6466 12.3535C11.4513 12.1583 11.4513 11.8417 11.6466 11.6464L18.7929 4.5001L15.5004 4.5001C15.2243 4.5001 15.0006 4.27622 15.0005 4.00015Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {instance.pageName} › {instance.parentName}
                </div>
                {instance.deletedComponentName && (
                  <div className="text-[10px] text-gray-500 mt-0.5">Original: {instance.deletedComponentName}</div>
                )}
                {instance.matchedComponentId ? (
                  <div className="text-[10px] text-green-600 mt-1">✓ Match: {instance.matchedComponentName}</div>
                ) : (
                  <div className="text-[10px] text-red-600 mt-1">
                    ✗ <strong>{instance.deletedComponentName || instance.instanceName}</strong> missing
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom buttons */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ height: '32px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReplace}
            disabled={selectedIds.size === 0 || isScanning}
            className="flex-1 text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              height: '32px',
              backgroundColor: selectedIds.size === 0 || isScanning ? '#ccc' : '#0d99ff',
              color: 'white',
              cursor: selectedIds.size === 0 || isScanning ? 'not-allowed' : 'pointer',
            }}
          >
            Replace ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
