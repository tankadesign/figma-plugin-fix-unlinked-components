import type { PluginMessage, ReplaceMessage, ScanMessage, UnlinkedInstance } from '../types'

figma.showUI(__html__, {
  themeColors: true,
  width: 400,
  height: 600,
})

// Find all unlinked instances in the specified scope
async function findUnlinkedInstances(scope: 'current-page' | 'entire-document'): Promise<UnlinkedInstance[]> {
  const unlinkedInstances: UnlinkedInstance[] = []

  // Load all pages if scanning entire document
  if (scope === 'entire-document') {
    await figma.loadAllPagesAsync()
  }

  const pagesToScan = scope === 'current-page' ? [figma.currentPage] : figma.root.children

  for (const page of pagesToScan) {
    const instances = page.findAll((node) => node.type === 'INSTANCE') as InstanceNode[]

    for (const instance of instances) {
      const mainComponent = await instance.getMainComponentAsync()

      // Check if component needs restoration:
      // - mainComponent exists but parent is null (deleted from file but instance remains)
      // - removed === false means it's not an external library component
      // - remote === false means it's not linked to an external file
      const isUnlinked =
        mainComponent !== null &&
        mainComponent.parent === null &&
        mainComponent.removed === false &&
        mainComponent.remote === false &&
        mainComponent.type === 'COMPONENT'

      if (isUnlinked) {
        // Get parent frame/group name for context
        let parent = instance.parent
        let parentName = 'Root'
        while (parent && parent.type !== 'PAGE') {
          if ('name' in parent && parent.name) {
            parentName = parent.name
            break
          }
          parent = parent.parent
        }

        unlinkedInstances.push({
          instanceId: instance.id,
          instanceName: instance.name,
          pageName: page.name,
          parentName,
          matchedComponentId: null,
          matchedComponentName: null,
          deletedComponentName: mainComponent.name, // Store the original component name
        })
      }
    }
  }

  return unlinkedInstances
}

// Find all components and match by exact name (case-insensitive)
async function findMatchingComponents(unlinkedInstances: UnlinkedInstance[]): Promise<UnlinkedInstance[]> {
  await figma.loadAllPagesAsync()

  const allComponents = figma.root.findAllWithCriteria({
    types: ['COMPONENT'],
  }) as ComponentNode[]

  // Create a map of component names (lowercase) to components
  const componentMap = new Map<string, ComponentNode>()
  for (const component of allComponents) {
    const normalizedName = component.name.toLowerCase()
    // Only store the first match for each name
    if (!componentMap.has(normalizedName)) {
      componentMap.set(normalizedName, component)
    }
  }

  // Match unlinked instances to components by exact name
  return unlinkedInstances.map((instance) => {
    // Try to match by the deleted component's name first, then by instance name
    const searchName = instance.deletedComponentName || instance.instanceName
    const normalizedSearchName = searchName.toLowerCase()
    const matchedComponent = componentMap.get(normalizedSearchName)

    if (matchedComponent) {
      return {
        ...instance,
        matchedComponentId: matchedComponent.id,
        matchedComponentName: matchedComponent.name,
      }
    }

    return instance
  })
}

// Replace unlinked instances with matched components
async function replaceInstances(
  instanceIds: string[],
  unlinkedInstancesMap: Map<string, UnlinkedInstance>,
): Promise<{ successCount: number; totalCount: number }> {
  let successCount = 0
  const totalCount = instanceIds.length

  await figma.loadAllPagesAsync()

  for (const instanceId of instanceIds) {
    try {
      const node = await figma.getNodeByIdAsync(instanceId)

      if (!node || node.type !== 'INSTANCE') {
        continue
      }

      const instance = node as InstanceNode
      const unlinkedInstance = unlinkedInstancesMap.get(instanceId)

      // Find matching component by exact name (use deleted component name if available)
      const allComponents = figma.root.findAllWithCriteria({
        types: ['COMPONENT'],
      }) as ComponentNode[]

      const searchName = unlinkedInstance?.deletedComponentName || instance.name
      const matchedComponent = allComponents.find((comp) => comp.name.toLowerCase() === searchName.toLowerCase())

      if (matchedComponent) {
        // Swap the instance to the matched component
        instance.swapComponent(matchedComponent)
        successCount++
      }
    } catch (error) {
      console.error(`Failed to replace instance ${instanceId}:`, error)
    }
  }

  return { successCount, totalCount }
}

// Handle messages from UI
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    if (msg.type === 'scan') {
      const scanMsg = msg as ScanMessage
      const unlinkedInstances = await findUnlinkedInstances(scanMsg.scope)
      const matchedInstances = await findMatchingComponents(unlinkedInstances)

      figma.ui.postMessage({
        type: 'scan-result',
        instances: matchedInstances,
      })
    } else if (msg.type === 'replace') {
      const replaceMsg = msg as ReplaceMessage

      // Re-scan to get current state with deleted component names
      const unlinkedInstances = await findUnlinkedInstances('current-page')
      const instancesMap = new Map(unlinkedInstances.map((inst) => [inst.instanceId, inst]))

      const result = await replaceInstances(replaceMsg.instanceIds, instancesMap)

      figma.ui.postMessage({
        type: 'replace-complete',
        successCount: result.successCount,
        totalCount: result.totalCount,
      })

      // Close the plugin after successful replacement
      if (result.successCount > 0) {
        figma.closePlugin(`Replaced ${result.successCount} of ${result.totalCount} instances`)
      } else {
        figma.closePlugin('No instances were replaced')
      }
    } else if (msg.type === 'select') {
      const selectMsg = msg as { type: 'select'; instanceId: string }
      const node = await figma.getNodeByIdAsync(selectMsg.instanceId)
      if (node && node.type === 'INSTANCE') {
        // Navigate to the page containing the node
        const nodePage = node.parent?.type === 'PAGE' ? node.parent : figma.currentPage
        await figma.setCurrentPageAsync(nodePage)
        // Select the node and zoom to it
        figma.currentPage.selection = [node]
        figma.viewport.scrollAndZoomIntoView([node])
      }
    } else if (msg.type === 'cancel') {
      figma.closePlugin()
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    })
  }
}
