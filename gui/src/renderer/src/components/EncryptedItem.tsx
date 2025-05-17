import { useNewOperation } from '@renderer/hooks/useNewOperation'
import cardActions from '@renderer/constants/cardActions'
import { StorageItem } from '../../../../../types'
import { Card, Popconfirm, Tooltip } from 'antd'
import formatBytes from '@utils/formatBytes'
import * as Icons from '@ant-design/icons'
import useApp from 'antd/es/app/useApp'
import { useMemo } from 'react'

interface LoadCardProps {
  item: StorageItem
}

const EncryptedItem = ({ item }: LoadCardProps) => {
  const { newDecrypt } = useNewOperation()
  const { message } = useApp()

  const renderActions = useMemo(
    () =>
      cardActions.map(({ Icon, key, title, ...rest }) => (
        <Tooltip
          className={rest.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          title={rest.disabled ? undefined : title}
          key={key}
        >
          {rest.popconfirm ? (
            <Popconfirm
              title="¿Estás seguro de que quieres continuar?"
              disabled={rest.disabled}
              style={{ color: 'red' }}
              onConfirm={() => {
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
              <Icon />
            </Popconfirm>
          ) : (
            <Icon disabled={rest.disabled} />
          )}
        </Tooltip>
      )),
    [item, message, newDecrypt]
  )

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
