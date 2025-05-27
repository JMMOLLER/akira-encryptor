import './assets/main.css'

import { PendingOperationProvider } from './contexts/PendingOperationContext'
import { EncryptedItemProvider } from './contexts/EncryptedItemContext'
import fluentColorIcons from '@iconify-json/fluent-color/icons.json'
import { MenuItemProvider } from './contexts/MenuItemContext'
import { UserConfigProvider } from './contexts/UserConfig'
import { App as AntdApp, ConfigProvider } from 'antd'
import { addCollection } from '@iconify/react'
import { createRoot } from 'react-dom/client'
import esES from 'antd/locale/es_ES'
import theme from './configs/theme'
import { StrictMode } from 'react'
import App from './App'

addCollection(fluentColorIcons)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={theme} locale={esES}>
      <AntdApp>
        <UserConfigProvider>
          <EncryptedItemProvider>
            <PendingOperationProvider>
              <MenuItemProvider>
                <App />
              </MenuItemProvider>
            </PendingOperationProvider>
          </EncryptedItemProvider>
        </UserConfigProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>
)
