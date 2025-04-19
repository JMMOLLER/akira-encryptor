import { useMenuItem } from '@renderer/hooks/useMenuItemContext'
import items from '@renderer/constants/menuItems'
import { MenuInfo } from 'rc-menu/lib/interface'
import Sider from 'antd/es/layout/Sider'
import { useState } from 'react'
import { Menu } from 'antd'

const defaultSelectedKey: MenuItemOptions[] = ['files']

function Navbar() {
  const [collapsed, setCollapsed] = useState(false)
  const { setItem } = useMenuItem()

  const handleSelect = (item: MenuInfo) => {
    setItem(item.key as MenuItemOptions)
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
        mode="inline"
        items={items}
      />
    </Sider>
  )
}

export default Navbar
