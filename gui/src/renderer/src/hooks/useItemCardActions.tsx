import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useNewOperation } from '@renderer/hooks/useNewOperation'
import generateUID from '@utils/generateUID'
import { Popconfirm, Tooltip } from 'antd'
import * as Icons from '@ant-design/icons'
import useApp from 'antd/es/app/useApp'
import delay from '@utils/delay'

interface Props {
  item: StorageItemType
}

const useItemCardActions = ({ item }: Props) => {
  const { newDecrypt } = useNewOperation()
  const { setItems } = useEncryptedItems()
  const { message } = useApp()

  const toggleVisibility = async () => {
    const id = generateUID()
    message.open({
      type: 'loading',
      content: 'Alternando visibilidad del contenido...',
      key: `toggle-visibility-${id}`
    })

    const [res] = await Promise.all([
      window.api.changeVisibility({
        action: item.isHidden ? 'show' : 'hide',
        itemId: item.id
      }),
      delay(500)
    ])

    message.destroy(`toggle-visibility-${id}`)

    if (res.error) {
      message.error('Error al alternar la visibilidad del contenido.')
    } else {
      message.success('Contenido alternado con éxito.')
      setItems(undefined)
    }
  }

  const decryptItem = () => {
    if (item.isHidden) {
      message.info('Cambia la visibilidad del elemento antes de desencriptarlo.')
      return
    }

    const lastSlash = Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\')) + 1
    if (lastSlash <= 0) {
      message.error('Ruta de archivo no válida.')
      return
    }

    const basePath = item.path.substring(0, lastSlash)
    const fileName = item.id + (item.type === 'file' ? '.enc' : '')
    const filePath = `${basePath}${fileName}`

    newDecrypt({
      actionFor: item.type,
      id: item.id,
      srcPath: filePath
    })
  }

  return [
    <Tooltip title={item.isHidden ? 'Mostrar elemento' : 'Ocultar elemento'} key="visibility">
      {item.isHidden ? (
        <Icons.EyeInvisibleOutlined onClick={toggleVisibility} />
      ) : (
        <Icons.EyeOutlined onClick={toggleVisibility} />
      )}
    </Tooltip>,
    <Tooltip title="Desencriptar" key="decrypt">
      <Popconfirm title="¿Estás seguro de que quieres continuar?" onConfirm={decryptItem}>
        <Icons.KeyOutlined />
      </Popconfirm>
    </Tooltip>,
    <Tooltip title="Información" key="info">
      <Icons.InfoCircleOutlined className="opacity-50 cursor-not-allowed" />
    </Tooltip>
  ]
}

export default useItemCardActions
