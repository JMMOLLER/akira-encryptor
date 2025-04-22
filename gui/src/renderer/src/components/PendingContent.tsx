import { usePendingEncryption } from '@renderer/hooks/usePendingEncrypt'
import { useEffect, useMemo } from 'react'
import SkeletonCard from './SkeletonCard'
import { Typography } from 'antd'

function PendingContent() {
  const { pendingEncryptedItems, setPendingEncryptedItems } = usePendingEncryption()
  const values = useMemo(() => {
    if (!pendingEncryptedItems) return []
    return Array.from(pendingEncryptedItems.values())
  }, [pendingEncryptedItems])

  useEffect(() => {
    const onProgressHandler = (_: unknown, data: ProgressCallbackProps) => {
      setPendingEncryptedItems((prev) => {
        const newMap = new Map(prev)
        const item = newMap.get(data.itemId)

        if (!item) return prev

        item.percent = Math.floor((data.processedBytes / data.totalBytes) * 100)

        return newMap
      })
    }
    const onProgressErrorHandler = (_: unknown, data: ProgressCallbackErrorProps) => {
      setPendingEncryptedItems((prev) => {
        const newMap = new Map(prev)
        const item = newMap.get(data.itemId)

        if (!item) return prev

        item.status = 'error'
        item.message = data.message
        item.filePath = data.filePath

        return newMap
      })
    }

    // Register the listeners
    const unsubscribe = window.electron.ipcRenderer.on('onProgress', onProgressHandler)
    const onErrorUnsubscribe = window.electron.ipcRenderer.on(
      'onProgressError',
      onProgressErrorHandler
    )

    // Flush the listeners
    return () => {
      unsubscribe()
      onErrorUnsubscribe()
    }
  }, [setPendingEncryptedItems])

  if (pendingEncryptedItems.size < 1) return null

  return (
    <>
      <Typography.Title level={2} className="text-gray-400">
        En proceso — {pendingEncryptedItems.size}
      </Typography.Title>
      <div className="flex content-start flex-wrap gap-5">
        {values.map((pendingItem, index) => (
          <SkeletonCard key={index} encryptedItem={pendingItem} />
        ))}
      </div>
    </>
  )
}

export default PendingContent
