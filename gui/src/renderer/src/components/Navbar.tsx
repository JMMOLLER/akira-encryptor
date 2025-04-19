import * as Icons from '@ant-design/icons'
import Sider from 'antd/es/layout/Sider'
import { useState } from 'react'
import { Menu } from 'antd'

function Navbar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Sider
      className="backdrop-blur-md"
      onClick={() => setCollapsed(!collapsed)}
      defaultCollapsed
      collapsible
    >
      <div className="demo-logo-vertical" />
      <Menu
        mode="inline"
        defaultSelectedKeys={['1']}
        items={[
          {
            key: '1',
            icon: <Icons.FileImageOutlined />,
            label: 'Archivos'
          },
          {
            key: '2',
            icon: <Icons.FolderOutlined />,
            label: 'Carpetas'
          },
          {
            type: 'divider',
            className: 'bg-white/20'
          },
          {
            key: '3',
            icon: <Icons.SettingOutlined />,
            label: 'Ajustes',
            disabled: true
          }
        ]}
      />
    </Sider>
  )
}

export default Navbar
