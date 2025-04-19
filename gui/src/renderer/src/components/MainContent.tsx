import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { Content } from 'antd/es/layout/layout'
import { useEffect, useRef } from 'react'
import SkeletonCard from './SkeletonCard'
import NewEncrypt from './NewEncrypt'
import LoadCard from './LoadCard'
import { Layout } from 'antd'
import Flip from 'gsap/Flip'
import gsap from 'gsap'

// Register GSAP plugins
gsap.registerPlugin(Flip)

function MainContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const { encryptedItems } = useEncryptedItems()

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
      <Content
        className="flex content-start flex-wrap gap-5 py-4 px-6 overflow-auto"
        ref={contentRef}
      >
        {!encryptedItems
          ? new Array(5).fill(0).map((_, index) => <SkeletonCard key={index} />)
          : encryptedItems.map((encryptedItem, index) => (
              <LoadCard key={index} encryptedItem={encryptedItem} />
            ))}
      </Content>
      <NewEncrypt />
    </Layout>
  )
}

export default MainContent
