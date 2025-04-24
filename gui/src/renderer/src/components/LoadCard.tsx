import { usePendingEncryption } from '@renderer/hooks/usePendingEncrypt'
import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useUserConfig } from '@renderer/hooks/useUserConfig'
import cardActions from '@renderer/constants/cardActions'
import { Avatar, Card, Popconfirm, Tooltip } from 'antd'
import { StorageItem } from '../../../../../types'
import formatBytes from '@utils/formatBytes'
import useApp from 'antd/es/app/useApp'
import { useMemo } from 'react'

interface LoadCardProps {
  encryptedItem: StorageItem
}

const LoadCard = ({ encryptedItem }: LoadCardProps) => {
  const { setPendingEncryptedItems } = usePendingEncryption()
  const { setItems } = useEncryptedItems()
  const { userConfig } = useUserConfig()
  const { message } = useApp()

  const renderActions = useMemo(
    () =>
      cardActions.map(({ Icon, key, title, onclick }) => (
        <Tooltip title={title} key={key}>
          <Popconfirm
            style={{ color: 'red' }}
            title="¿Estás seguro de que quieres continuar?"
            onConfirm={() =>
              onclick({
                setter: setPendingEncryptedItems,
                password: userConfig.password!,
                setEncryptedItems: setItems,
                item: encryptedItem,
                message
              })
            }
          >
            <Icon />
          </Popconfirm>
        </Tooltip>
      )),
    [encryptedItem, message, userConfig.password, setItems, setPendingEncryptedItems]
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

  return (
    <Card className="w-[350px] h-min" actions={renderActions}>
      <Card.Meta
        avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />}
        title={encryptedItem.type === 'file' ? 'Archivo Encriptado' : 'Carpeta Encriptada'}
        description={renderDescription}
      />
    </Card>
  )
}

export default LoadCard
