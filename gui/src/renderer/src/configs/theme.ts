import { ConfigProviderProps } from 'antd'

const theme: ConfigProviderProps['theme'] = {
  components: {
    Menu: {
      colorBgContainer: 'transparent',
      itemDisabledColor: '#ffffff70',
      colorText: '#fff'
    },
    Layout: {
      colorText: '#fff',
      bodyBg: 'transparent',
      siderBg: '#81818185',
      triggerBg: '#00000010'
    },
    Typography: {
      colorTextHeading: '#fff'
    }
  }
}

export default theme
