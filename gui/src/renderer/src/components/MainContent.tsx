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

    const observer = new ResizeObserver(() => {
      // Check if the content is smaller than 770px
      const shouldCenter = content.offsetWidth < 770
      content.classList.toggle('justify-center', shouldCenter)

      // Animate the cards
      const state = Flip.getState('.ant-card')
      Flip.from(state, {
        ease: 'power1.inOut',
        absolute: true,
        duration: 0.5
      })
    })

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
