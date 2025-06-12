import SettingsForm from '@renderer/components/SettingsForm'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import type { MenuInfo } from 'rc-menu/lib/interface'
import items from '@renderer/constants/menuItems'
import Sider from 'antd/es/layout/Sider'
import { useState } from 'react'

import { Menu } from 'antd'

const defaultSelectedKey: MenuItemOptions[] = ['files']

function Aside() {
  const [collapsed, setCollapsed] = useState(false)
  const { menuItem, setMenuItem } = useMenuItem()

  const handleSelect = (item: MenuInfo) => {
    setMenuItem(item.key as MenuItemOptions)
  }

  return (
    <Sider
      className="backdrop-blur-md z-10"
      onClick={() => setCollapsed(!collapsed)}
      defaultCollapsed
      collapsible
    >
      <div className="demo-logo-vertical" />
      <Menu
        defaultSelectedKeys={defaultSelectedKey}
        onSelect={handleSelect}
        selectedKeys={[menuItem]}
        mode="inline"
        items={items}
      />
      <SettingsForm />
    </Sider>
  )
}

export default Aside
