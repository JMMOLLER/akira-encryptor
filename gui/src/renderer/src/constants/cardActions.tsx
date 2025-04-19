import { InfoCircleOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'

const cardActions: React.ReactNode[] = [
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

export default cardActions
