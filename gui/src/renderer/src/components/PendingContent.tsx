import { usePendingOperation } from '@renderer/hooks/usePendingOperation'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import SkeletonCard from './SkeletonCard'
import { Typography } from 'antd'
import { useMemo } from 'react'

function PendingContent() {
  const { pendingItems } = usePendingOperation()
  const { menuItem } = useMenuItem()

  const values = useMemo(() => {
    if (!pendingItems) return []
    return Array.from(
      pendingItems.values().filter((item) => {
        if (menuItem === 'files') return item.type === 'file'
        if (menuItem === 'folders') return item.type === 'folder'
        return false
      })
    )
  }, [pendingItems, menuItem])

  if (values.length < 1) return null

  return (
    <>
      <Typography.Title level={2} className="text-gray-400">
        En proceso — {values.length}
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
