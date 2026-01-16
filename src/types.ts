// Message types for communication between plugin and UI
export interface UnlinkedInstance {
  instanceId: string
  instanceName: string
  pageName: string
  parentName: string
  matchedComponentId: string | null
  matchedComponentName: string | null
  deletedComponentName?: string // Name of the deleted main component
}

export interface ScanMessage {
  type: 'scan'
  scope: 'current-page' | 'entire-document'
}

export interface ScanResultMessage {
  type: 'scan-result'
  instances: UnlinkedInstance[]
}

export interface ReplaceMessage {
  type: 'replace'
  instanceIds: string[]
}

export interface SelectMessage {
  type: 'select'
  instanceId: string
}

export interface CancelMessage {
  type: 'cancel'
}

export interface ReplaceCompleteMessage {
  type: 'replace-complete'
  successCount: number
  totalCount: number
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type PluginMessage = ScanMessage | ReplaceMessage | SelectMessage | CancelMessage

export type UIMessage = ScanResultMessage | ReplaceCompleteMessage | ErrorMessage
