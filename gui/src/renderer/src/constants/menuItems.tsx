import * as Icons from '@ant-design/icons'

const items: CustomItemType[] = [
  {
    key: 'files',
    icon: <Icons.FileImageOutlined />,
    label: 'Archivos'
  },
  {
    key: 'folders',
    icon: <Icons.FolderOutlined />,
    label: 'Carpetas'
  },
  {
    type: 'divider',
    className: 'bg-white/20'
  },
  {
    key: 'settings',
    icon: <Icons.SettingOutlined />,
    label: 'Ajustes'
  }
]

export default items
