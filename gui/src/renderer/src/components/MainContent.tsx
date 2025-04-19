import { InfoCircleOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { Avatar, Card, Layout, Tooltip } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Content } from 'antd/es/layout/layout'
import NewEncrypt from './NewEncrypt'
import Flip from 'gsap/Flip'
import gsap from 'gsap'

// Register GSAP plugins
gsap.registerPlugin(Flip)

const actions: React.ReactNode[] = [
  <Tooltip title="Mostrar" key="show">
    <EyeOutlined />
  </Tooltip>,
  <Tooltip title="Desencriptar" key="decrypt">
    <KeyOutlined />
  </Tooltip>,
  <Tooltip title="Información" key="info">
    <InfoCircleOutlined />
  </Tooltip>
]

function MainContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [loading, _setLoading] = useState(false)
  const { item } = useMenuItem()

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
        {new Array(5).fill(0).map((_, index) => (
          <Card key={index} className="w-[350px] h-min" loading={loading} actions={actions}>
            <Card.Meta
              avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />}
              title={item === 'files' ? 'Archivo Encriptado' : 'Carpeta Encriptada'}
              description={
                <ul>
                  <li>
                    <span className="font-semibold">Nombre:</span> archivo.txt
                  </li>
                  <li>
                    <span className="font-semibold">Tamaño:</span> 2.5 MB
                  </li>
                </ul>
              }
            />
          </Card>
        ))}
      </Content>
      <NewEncrypt />
    </Layout>
  )
}

export default MainContent
