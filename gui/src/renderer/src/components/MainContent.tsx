import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { Layout, Spin, Typography } from 'antd'
import { Content } from 'antd/es/layout/layout'
import PendingContent from './PendingContent'
import NewEncrypt from './NewEncrypt'
import LoadCard from './LoadCard'
import Flip from 'gsap/Flip'
import gsap from 'gsap'

// Register GSAP plugins
gsap.registerPlugin(Flip)

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

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const cardsSelector = '.ant-card, .skeleton-card'
    let previousWidth: number | undefined

    /**
     * @description `[ESP]` Este cambio mas que nada se realizo porque GSAP hacia un bucle infinito con el transorm y transform3d porque el Content pasaba de tener overflow a no tenerlo al aplicar a todas las cards la propiedad absolute 🤡.
     * @description `[ENG]` This change was made because GSAP caused an infinite loop with the transform and transform3d because the Content changed from having overflow to not having it when applying the absolute property to all cards.
     */
    const handleResize = (entries: ResizeObserverEntry[]) => {
      const { contentRect } = entries[0]
      const currentWidth = contentRect.width ?? 0
      const difference = Math.abs(currentWidth - (previousWidth ?? 0))

      // Only animate if the difference is significant
      if (difference > 5) {
        const shouldCenter = content.offsetWidth < 770
        content.classList.toggle('justify-center', shouldCenter)

        // Animate the cards
        const state = Flip.getState(cardsSelector)
        Flip.from(state, {
          ease: 'power1.inOut',
          absolute: true,
          duration: 0.5,
          onComplete: () => {
            gsap.set(cardsSelector, { clearProps: 'all' })
          }
        })

        previousWidth = currentWidth
      }

      // Save the current width for the next resize event
      if (!previousWidth && currentWidth > 0) {
        previousWidth = currentWidth
      }
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(content)

    return () => observer.disconnect()
  }, [])

  return (
    <Layout className="h-screen">
      <Content className="py-4 px-6 space-y-2.5! overflow-auto" ref={contentRef}>
        <PendingContent />

        <Typography.Title level={2} className="text-gray-400">
          {selectedItem === 'files' ? 'Archivos encriptados' : 'Carpetas encriptadas'} —{' '}
          {encItems.length ?? 0}
        </Typography.Title>
        <div
          className="flex content-start flex-wrap gap-5 min-h-[calc(100%_-_3rem)] aria-busy:justify-center aria-busy:content-center **:[.ant-spin-blur]:opacity-0!"
          aria-busy={!encryptedItems}
        >
          {!encryptedItems ? (
            <Spin className="text-white!" tip="Cargando" size="large">
              <span className="p-10" />
            </Spin>
          ) : (
            encItems.map((encryptedItem, index) => (
              <LoadCard key={index} encryptedItem={encryptedItem} />
            ))
          )}
        </div>
      </Content>
      <NewEncrypt />
    </Layout>
  )
}

export default MainContent
