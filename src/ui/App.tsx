import { useCallback, useEffect, useState } from 'react'
import type { ScanResultMessage, UIMessage, UnlinkedInstance } from '../types'

function App() {
  const [scope, setScope] = useState<'current-page' | 'project'>('current-page')
  const [instances, setInstances] = useState<UnlinkedInstance[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isScanning, setIsScanning] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number; pageName?: string } | null>(null)
  const [showMissing, setShowMissing] = useState(false)
  const [allChecked, setAllChecked] = useState(false)

  // Scan for unlinked instances on mount
  useEffect(() => {
    setIsScanning(true)
    parent.postMessage({ pluginMessage: { type: 'scan', scope } }, '*')
  }, [scope])

  // Handle scope change - rescan when scope changes
  const handleScopeChange = useCallback(() => {
    const newScope = scope === 'current-page' ? 'project' : 'current-page'
    setScope(newScope)
    setIsScanning(true)
    setInstances([])
    setSelectedIds(new Set())
    setError(null)
    setShowMissing(false)
    setAllChecked(false)

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
        setProgress(null)

        // Auto-select instances that have matches
        const withMatches = new Set(
          scanResult.instances.filter((inst) => inst.matchedComponentId !== null).map((inst) => inst.instanceId),
        )
        setSelectedIds(withMatches)
        setAllChecked(withMatches.size > 0)
      } else if (msg.type === 'progress') {
        const progressMsg = msg as { type: 'progress'; current: number; total: number; pageName?: string }
        setProgress({ current: progressMsg.current, total: progressMsg.total, pageName: progressMsg.pageName })
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

  const handleToggleAll = useCallback(() => {
    if (allChecked) {
      setSelectedIds(new Set())
      setAllChecked(false)
    } else {
      const allMatchedIds = new Set(
        instances.filter((inst) => inst.matchedComponentId !== null).map((inst) => inst.instanceId),
      )
      setSelectedIds(allMatchedIds)
      setAllChecked(true)
    }
  }, [instances, allChecked])

  const handleToggleMissing = useCallback(() => {
    setShowMissing((prev) => !prev)
  }, [])

  const handleRefresh = useCallback(() => {
    setIsScanning(true)
    setInstances([])
    setSelectedIds(new Set())
    setError(null)
    setProgress(null)
    setShowMissing(false)
    setAllChecked(false)
    parent.postMessage({ pluginMessage: { type: 'scan', scope } }, '*')
  }, [scope])

  // Handle resize dragging
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = window.innerWidth
    const startHeight = window.innerHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const newWidth = Math.max(360, startWidth + deltaX)
      const newHeight = Math.max(240, startHeight + deltaY)

      parent.postMessage({ pluginMessage: { type: 'resize', width: newWidth, height: newHeight } }, '*')
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--figma-color-bg)', color: 'var(--figma-color-text)' }}
    >
      {!isScanning && (
        <header className="p-3" style={{ borderBottom: '1px solid var(--figma-color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Refresh:</span>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isScanning}
                className="p-1 rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) =>
                  !isScanning && (e.currentTarget.style.backgroundColor = 'var(--figma-color-bg-hover)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                title="Refresh scan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 15 15">
                  <path
                    fill="currentColor"
                    d="M7.5.85c3.164 0 4.794 2.219 5.5 3.46v.002V2.5a.5.5 0 1 1 1 0v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1h1.733l-.112-.208c-.64-1.126-2.01-2.942-4.62-2.942c-3.44 0-5.651 2.815-5.651 5.65s2.21 5.65 5.65 5.65c1.665 0 3.03-.654 4.001-1.643l.192-.204a5.8 5.8 0 0 0 1.024-1.642l.048-.09a.5.5 0 0 1 .877.47l-.13.296a6.8 6.8 0 0 1-1.072 1.631l-.226.24c-1.152 1.173-2.77 1.942-4.714 1.942c-4.062 0-6.65-3.335-6.65-6.65C.85 4.186 3.438.85 7.5.85"
                  ></path>
                </svg>
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs">{scope === 'current-page' ? 'Current page' : 'Entire project'}</span>
              <input
                type="checkbox"
                checked={scope === 'project'}
                onChange={handleScopeChange}
                disabled={isScanning}
                className="w-8 h-5 appearance-none rounded-full relative cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: scope === 'project' ? '#0d99ff' : 'var(--figma-color-bg-secondary)',
                  backgroundImage:
                    scope === 'project'
                      ? 'radial-gradient(circle at 22px 10px, white 6px, transparent 6px)'
                      : 'radial-gradient(circle at 10px 10px, white 6px, transparent 6px)',
                }}
              />
            </label>
          </div>

          {error && (
            <div
              className="p-2 rounded text-xs mb-3"
              style={{
                backgroundColor: 'var(--figma-color-bg-warning)',
                border: '1px solid var(--figma-color-border)',
                color: 'var(--figma-color-text)',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {!isScanning && instances.length === 0 && (
            <div className="text-xs" style={{ color: 'var(--figma-color-text-secondary)' }}>
              No unlinked component instances found {scope === 'project' ? 'in project' : 'in current page'}.
            </div>
          )}

          {!isScanning && instances.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold">
                Found {instances.length} unlinked instance{instances.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-1">
                {!showMissing && (
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-[10px] font-medium rounded transition-colors"
                    style={{
                      padding: '2px 4px',
                      backgroundColor: allChecked ? '#0d99ff' : 'transparent',
                      color: allChecked ? 'white' : 'var(--figma-color-text)',
                      border: `1px solid ${allChecked ? ' transparent' : 'var(--figma-color-border)'}`,
                    }}
                  >
                    Toggle matches
                  </button>
                )}
                {instances.filter((inst) => inst.matchedComponentId === null).length > 2 && (
                  <button
                    type="button"
                    onClick={handleToggleMissing}
                    className="text-[10px] font-medium rounded transition-colors"
                    style={{
                      padding: '2px 4px',
                      backgroundColor: showMissing ? '#0d99ff' : 'transparent',
                      color: showMissing ? 'white' : 'var(--figma-color-text)',
                      border: `1px solid ${showMissing ? ' transparent' : 'var(--figma-color-border)'}`,
                    }}
                  >
                    {showMissing ? 'Hide missing' : 'Show missing'}
                  </button>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      {/* Scrollable list of instances */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isScanning && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle cx="16" cy="16" r="12" stroke="var(--figma-color-border)" strokeWidth="3" strokeLinecap="round" />
              <path d="M16 4 A12 12 0 0 1 28 16" stroke="#0d99ff" strokeWidth="3" strokeLinecap="round" />
            </svg>

            <div className="text-xs text-center" style={{ color: 'var(--figma-color-text-secondary)' }}>
              {progress && progress.total > 0
                ? `Processing ${progress.current} / ${progress.total} instances`
                : 'Scanning for unlinked components...'}
            </div>
            {progress?.pageName && (
              <div className="text-[10px] text-center" style={{ color: 'var(--figma-color-text-secondary)' }}>
                Page: {progress.pageName}
              </div>
            )}
          </div>
        )}

        {/* Missing components list */}
        {!isScanning && showMissing && (
          <div className="p-3">
            <div className="text-xs font-semibold mb-3">Missing Components:</div>
            {Array.from(
              new Set(
                instances
                  .filter((inst) => inst.matchedComponentId === null)
                  .map((inst) => inst.deletedComponentName || inst.instanceName),
              ),
            )
              .sort()
              .map((name) => (
                <div
                  key={name}
                  className="py-2 text-xs"
                  style={{
                    borderBottom: '1px solid var(--figma-color-border)',
                    color: 'var(--figma-color-text)',
                  }}
                >
                  {name}
                </div>
              ))}
          </div>
        )}

        {/* Instance list */}
        {!isScanning &&
          !showMissing &&
          (() => {
            if (scope === 'project') {
              // Group instances by page
              const instancesByPage = instances.reduce(
                (acc, instance) => {
                  if (!acc[instance.pageName]) {
                    acc[instance.pageName] = []
                  }
                  acc[instance.pageName].push(instance)
                  return acc
                },
                {} as Record<string, UnlinkedInstance[]>,
              )

              return Object.entries(instancesByPage).map(([pageName, pageInstances]) => (
                <div key={pageName}>
                  {/* Page header */}
                  <div
                    className="px-3 py-2 text-xs font-semibold sticky top-0 z-10"
                    style={{
                      backgroundColor: 'var(--figma-color-bg-secondary)',
                      borderBottom: '1px solid var(--figma-color-border)',
                      color: 'var(--figma-color-text)',
                    }}
                  >
                    {pageName} ({pageInstances.length})
                  </div>
                  {/* Instances in this page */}
                  {pageInstances.map((instance) => (
                    <div
                      key={instance.instanceId}
                      className="p-3 transition-colors"
                      style={{ borderBottom: '1px solid var(--figma-color-border)', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--figma-color-bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleCheckboxChange(instance.instanceId, !selectedIds.has(instance.instanceId))
                          }
                          disabled={instance.matchedComponentId === null}
                          className="mt-0.5 w-4 h-4 shrink-0 rounded disabled:opacity-10 disabled:cursor-not-allowed transition-colors"
                          style={{
                            backgroundColor: selectedIds.has(instance.instanceId) ? '#0d99ff' : 'white',
                            border: '1.5px solid',
                            borderColor: selectedIds.has(instance.instanceId) ? '#0d99ff' : '#999',
                          }}
                          aria-label="Select instance"
                        >
                          {selectedIds.has(instance.instanceId) && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width={16}
                              height={16}
                              viewBox="0 0 15 15"
                              style={{ translate: '-1.5px -1.5px' }}
                            >
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
                              className="shrink-0 p-1 rounded transition-colors"
                              style={{ backgroundColor: 'transparent' }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = 'var(--figma-color-bg-hover)')
                              }
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title="Select in Figma"
                            >
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
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
                          <div className="text-[10px] mt-0.5" style={{ color: 'var(--figma-color-text-secondary)' }}>
                            {instance.parentName}
                          </div>
                          {instance.deletedComponentName && (
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--figma-color-text-secondary)' }}>
                              Original: {instance.deletedComponentName}
                            </div>
                          )}
                          {instance.matchedComponentId ? (
                            <div className="text-[10px] mt-1" style={{ color: '#0c0' }}>
                              ✓ Match: {instance.matchedComponentName}
                            </div>
                          ) : (
                            <div className="text-[10px] mt-1" style={{ color: '#f00' }}>
                              ✗ <strong>{instance.deletedComponentName || instance.instanceName}</strong> missing
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            } else {
              // Current page mode - show flat list
              return instances.map((instance) => (
                <div
                  key={instance.instanceId}
                  className="p-3 transition-colors"
                  style={{ borderBottom: '1px solid var(--figma-color-border)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--figma-color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckboxChange(instance.instanceId, !selectedIds.has(instance.instanceId))}
                      disabled={instance.matchedComponentId === null}
                      className="mt-0.5 w-4 h-4 shrink-0 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      style={{
                        backgroundColor: selectedIds.has(instance.instanceId) ? '#0d99ff' : 'white',
                        border: '1.5px solid',
                        borderColor: selectedIds.has(instance.instanceId) ? '#0d99ff' : '#999',
                      }}
                      aria-label="Select instance"
                    >
                      {selectedIds.has(instance.instanceId) && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={16}
                          height={16}
                          viewBox="0 0 15 15"
                          style={{ translate: '-1.5px -1.5px' }}
                        >
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
                          className="shrink-0 p-1 rounded transition-colors"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--figma-color-bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          title="Select in Figma"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
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
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--figma-color-text-secondary)' }}>
                        {instance.pageName} › {instance.parentName}
                      </div>
                      {instance.deletedComponentName && (
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--figma-color-text-secondary)' }}>
                          Original: {instance.deletedComponentName}
                        </div>
                      )}
                      {instance.matchedComponentId ? (
                        <div className="text-[10px] mt-1" style={{ color: '#0c0' }}>
                          ✓ Match: {instance.matchedComponentName}
                        </div>
                      ) : (
                        <div className="text-[10px] mt-1" style={{ color: '#f00' }}>
                          ✗ <strong>{instance.deletedComponentName || instance.instanceName}</strong> missing
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          })()}
      </div>

      {/* Fixed bottom buttons - hidden when showing missing */}
      {!showMissing && !isScanning && (
        <footer className="p-3 relative" style={{ borderTop: '1px solid var(--figma-color-border)' }}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 text-xs font-medium rounded focus:outline-none"
              style={{
                height: '32px',
                backgroundColor: 'var(--figma-color-bg-secondary)',
                color: 'var(--figma-color-text)',
                border: '1px solid var(--figma-color-border)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--figma-color-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--figma-color-bg-secondary)')}
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

          {/* Resize handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: '12px',
              height: '12px',
              cursor: 'nwse-resize',
              background: 'transparent',
            }}
            aria-label="Resize window"
          />
        </footer>
      )}
    </div>
  )
}

export default App
