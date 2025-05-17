import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { Layout, Spin, Typography } from 'antd'
import { Content } from 'antd/es/layout/layout'
import PendingContent from './PendingContent'
import NewEncrypt from './NewEncrypt'
import ItemCard from './ItemCard'

function MainContent() {
  const [selectedItem, setSelectedItem] = useState<string>()
  const contentRef = useRef<HTMLDivElement>(null)
  const { encryptedItems } = useEncryptedItems()
  const { menuItem } = useMenuItem()

  const encItems = useMemo(() => {
    if (!encryptedItems) return []
    return Array.from(
      encryptedItems.values().filter((encItem) => {
        if (menuItem === 'files') return encItem.type === 'file'
        if (menuItem === 'folders') return encItem.type === 'folder'
        return false
      })
    )
  }, [encryptedItems, menuItem])

  useEffect(() => {
    if (menuItem === 'files' || menuItem === 'folders') {
      setSelectedItem(menuItem)
    }
  }, [menuItem])

  return (
    <Layout className="h-screen">
      <Content className="py-4 px-6 space-y-2.5! overflow-auto" ref={contentRef}>
        <PendingContent />

        <Typography.Title level={2} className="text-gray-400">
          {selectedItem === 'files' ? 'Archivos encriptados' : 'Carpetas encriptadas'} —{' '}
          {encItems.length ?? 0}
        </Typography.Title>
        <div
          className="flex content-start flex-wrap gap-5 aria-busy:justify-center aria-busy:content-center **:[.ant-spin-blur]:opacity-0!"
          aria-busy={!encryptedItems}
        >
          {!encryptedItems ? (
            <Spin className="mt-16! text-white!" tip="Cargando" size="large">
              <span className="p-10" />
            </Spin>
          ) : (
            encItems.map((encryptedItem, index) => <ItemCard key={index} item={encryptedItem} />)
          )}
        </div>
      </Content>
      <NewEncrypt />
    </Layout>
  )
}

export default MainContent
