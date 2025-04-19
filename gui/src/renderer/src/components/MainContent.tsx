import { InfoCircleOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { Avatar, Card, Layout, Tooltip } from 'antd'
import { Content } from 'antd/es/layout/layout'
import { useState } from 'react'
import NewEncrypt from './NewEncrypt'

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
  const [loading, _setLoading] = useState(false)

  return (
    <Layout className="h-screen">
      <Content className="flex content-start flex-wrap gap-5 py-4 px-6 overflow-auto">
        {new Array(5).fill(0).map((_, index) => (
          <Card key={index} className="w-[350px] h-min" loading={loading} actions={actions}>
            <Card.Meta
              avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />}
              title="Archivo Encriptado"
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
