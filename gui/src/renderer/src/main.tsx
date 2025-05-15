import './assets/main.css'

import { PendingOperationProvider } from './contexts/PendingEncryption'
import { EncryptedItemProvider } from './contexts/EncryptedItemContext'
import { MenuItemProvider } from './contexts/MenuItemContext'
import { UserConfigProvider } from './contexts/UserConfig'
import { App as AntdApp, ConfigProvider } from 'antd'
import { createRoot } from 'react-dom/client'
import esES from 'antd/locale/es_ES'
import theme from './configs/theme'
import { StrictMode } from 'react'
import App from './App'

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
