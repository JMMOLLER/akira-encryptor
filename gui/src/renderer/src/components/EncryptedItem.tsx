import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useNewOperation } from '@renderer/hooks/useNewOperation'
import { useUserConfig } from '@renderer/hooks/useUserConfig'
import { StorageItem } from '../../../../../types'
import { Card, Popconfirm, Tooltip } from 'antd'
import generateUID from '@utils/generateUID'
import formatBytes from '@utils/formatBytes'
import * as Icons from '@ant-design/icons'
import useApp from 'antd/es/app/useApp'
import delay from '@utils/delay'
import { useMemo } from 'react'

interface LoadCardProps {
  item: StorageItem
}

const EncryptedItem = ({ item }: LoadCardProps) => {
  const password = useUserConfig().userConfig.password!
  const { newDecrypt } = useNewOperation()
  const { setItems } = useEncryptedItems()
  const { message } = useApp()

  const renderActions = useMemo(() => {
    const handleVisibilityClick = async () => {
      const id = generateUID()
      message.open({
        type: 'loading',
        content: 'Alternando visibilidad del contenido...',
        key: `toggle-visibility-${id}`
      })

      const [res] = await Promise.all([
        await window.api.changeVisibility({
          action: item.isHidden ? 'show' : 'hide',
          password: password,
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

    return [
      // Toggle visibility action
      <Tooltip title={item.isHidden ? 'Mostrar elemento' : 'Ocultar elemento'} key={'visibility'}>
        {!item.isHidden ? (
          <Icons.EyeOutlined onClick={handleVisibilityClick} />
        ) : (
          <Icons.EyeInvisibleOutlined onClick={handleVisibilityClick} />
        )}
      </Tooltip>,
      // Decrypt action
      <Tooltip title="Desencriptar" key="decrypt">
        <Popconfirm
          title="¿Estás seguro de que quieres continuar?"
          style={{ color: 'red' }}
          onConfirm={() => {
            if (item.isHidden) {
              message.info('Cambia la visibilidad del elemento antes de desencriptarlo.')
              return
            }

            const lastSlashIndex =
              Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\')) + 1
            if (lastSlashIndex < 0) {
              console.error('Invalid file path:', item.path)
              message.error('Ruta de archivo no válida.')
              return
            }

            // Construct the file path for decryption
            const basePath = item.path.substring(0, lastSlashIndex)
            const fileName = item.id + (item.type === 'file' ? '.enc' : '')
            const filePath = `${basePath}${fileName}`

            newDecrypt({
              actionFor: item.type,
              id: item.id,
              srcPath: filePath
            })
          }}
        >
          <Icons.KeyOutlined />
        </Popconfirm>
      </Tooltip>,
      // Info action
      <Tooltip className="opacity-50 cursor-not-allowed" title="Información" key="info">
        <Icons.InfoCircleOutlined />
      </Tooltip>
    ]
  }, [item, message, newDecrypt, setItems, password])

  const renderDescription = useMemo(
    () => (
      <ul>
        <li className="truncate">
          <span className="font-semibold">Nombre:</span>{' '}
          {item.originalName && item.originalName.length > 28 ? (
            <Tooltip title={item.originalName}>
              <span>{item.originalName}</span>
            </Tooltip>
          ) : (
            <span>{item.originalName}</span>
          )}
        </li>
        <li>
          <span className="font-semibold">Tamaño:</span> {formatBytes(item.size || 0)}
        </li>
      </ul>
    ),
    [item]
  )

  const renderAvatar = useMemo(() => {
    const className = 'w-8 h-8 text-5xl'
    if (item.type === 'folder') {
      return <Icons.FolderOpenOutlined className={className} />
    }
    const extension = item.originalName?.split('.').pop()?.toLowerCase()
    const imgExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
    const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg']
    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv']

    if (extension && imgExtensions.includes(extension)) {
      return <Icons.FileImageOutlined className={className} />
    } else if (extension && audioExtensions.includes(extension)) {
      return <Icons.CustomerServiceOutlined className={className} />
    } else if (extension && videoExtensions.includes(extension)) {
      return <Icons.PlaySquareOutlined className={className} />
    }

    return <Icons.FileUnknownOutlined className={className} />
  }, [item])

  return (
    <Card className="w-[350px] h-min" actions={renderActions}>
      <Card.Meta
        title={item.type === 'file' ? 'Archivo Encriptado' : 'Carpeta Encriptada'}
        description={renderDescription}
        avatar={renderAvatar}
      />
    </Card>
  )
}

export default EncryptedItem
