import { InfoCircleOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'

const cardActions = [
  {
    key: 'view',
    Icon: EyeOutlined,
    title: 'Ver contenido',
    onclick: () => {
      console.log('Not implemented yet.')
    }
  },
  {
    key: 'decrypt',
    Icon: KeyOutlined,
    title: 'Desencriptar',
    onclick: () => {
      console.log('Not implemented yet.')
    }
  },
  {
    key: 'info',
    Icon: InfoCircleOutlined,
    title: 'Información',
    onclick: () => {
      console.log('Not implemented yet.')
    }
  }
]

export default cardActions
