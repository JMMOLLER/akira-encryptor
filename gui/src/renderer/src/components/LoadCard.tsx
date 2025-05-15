import { useNewOperation } from '@renderer/hooks/useNewOperation'
import cardActions from '@renderer/constants/cardActions'
import { StorageItem } from '../../../../../types'
import { Card, Popconfirm, Tooltip } from 'antd'
import formatBytes from '@utils/formatBytes'
import * as Icons from '@ant-design/icons'
import useApp from 'antd/es/app/useApp'
import { useMemo } from 'react'

interface LoadCardProps {
  encryptedItem: StorageItem
}

const LoadCard = ({ encryptedItem }: LoadCardProps) => {
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
                  Math.max(
                    encryptedItem.path.lastIndexOf('/'),
                    encryptedItem.path.lastIndexOf('\\')
                  ) + 1
                if (lastSlashIndex < 0) {
                  console.error('Invalid file path:', encryptedItem.path)
                  message.error('Ruta de archivo no válida.')
                  return
                }

                // Construct the file path for decryption
                const basePath = encryptedItem.path.substring(0, lastSlashIndex)
                const fileName = encryptedItem.id + (encryptedItem.type === 'file' ? '.enc' : '')
                const filePath = `${basePath}${fileName}`

                newDecrypt({
                  actionFor: encryptedItem.type,
                  id: encryptedItem.id,
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
    [encryptedItem, message, newDecrypt]
  )

  const renderDescription = useMemo(
    () => (
      <ul>
        <li className="truncate">
          <span className="font-semibold">Nombre:</span>{' '}
          {encryptedItem.originalName && encryptedItem.originalName.length > 28 ? (
            <Tooltip title={encryptedItem.originalName}>
              <span>{encryptedItem.originalName}</span>
            </Tooltip>
          ) : (
            <span>{encryptedItem.originalName}</span>
          )}
        </li>
        <li>
          <span className="font-semibold">Tamaño:</span> {formatBytes(encryptedItem.size || 0)}
        </li>
      </ul>
    ),
    [encryptedItem]
  )

  const renderAvatar = useMemo(() => {
    const className = 'w-8 h-8 text-5xl'
    if (encryptedItem.type === 'folder') {
      return <Icons.FolderOpenOutlined className={className} />
    }
    const extension = encryptedItem.originalName?.split('.').pop()?.toLowerCase()
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
  }, [encryptedItem])

  return (
    <Card className="w-[350px] h-min" actions={renderActions}>
      <Card.Meta
        title={encryptedItem.type === 'file' ? 'Archivo Encriptado' : 'Carpeta Encriptada'}
        description={renderDescription}
        avatar={renderAvatar}
      />
    </Card>
  )
}

export default LoadCard
