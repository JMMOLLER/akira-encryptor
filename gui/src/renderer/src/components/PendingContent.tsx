import { usePendingEncryption } from '@renderer/hooks/usePendingEncrypt'
import SkeletonCard from './SkeletonCard'
import { Typography } from 'antd'
import { useMemo } from 'react'

function PendingContent() {
  const { pendingItems } = usePendingEncryption()
  const values = useMemo(() => {
    if (!pendingItems) return []
    return Array.from(pendingItems.values())
  }, [pendingItems])

  if (pendingItems.size < 1) return null

  return (
    <>
      <Typography.Title level={2} className="text-gray-400">
        En proceso — {pendingItems.size}
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
