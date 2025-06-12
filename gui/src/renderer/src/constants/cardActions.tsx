import { InfoCircleOutlined, EyeOutlined, KeyOutlined } from '@ant-design/icons'
import { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon'
import { MessageInstance } from 'antd/es/message/interface'

type OnClickProps = {
  item: StorageItem
  password: string
}

type CardAction = {
  onclick?: (props: OnClickProps, msg: MessageInstance) => void
  Icon: React.FC<Omit<AntdIconProps, 'ref'>>
  popconfirm?: boolean
  disabled?: boolean
  title: string
  key: string
}

const cardActions: CardAction[] = [
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
    popconfirm: true
  },
  {
    key: 'info',
    disabled: true,
    title: 'Información',
    Icon: InfoCircleOutlined,
    onclick: () => {
      console.log('Not implemented yet.')
    }
  }
]

export default cardActions
