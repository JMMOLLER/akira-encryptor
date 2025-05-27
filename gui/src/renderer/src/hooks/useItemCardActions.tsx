import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useNewOperation } from '@renderer/hooks/useNewOperation'
import generateUID from '@utils/generateUID'
import { Popconfirm, Tag, Tooltip } from 'antd'
import * as Icons from '@ant-design/icons'
import useApp from 'antd/es/app/useApp'
import { useDrawer } from './useDrawer'
import delay from '@utils/delay'
import formatBytes from '@utils/formatBytes'

interface Props {
  item: StorageItemType
}

const useItemCardActions = ({ item }: Props) => {
  const { newDecrypt } = useNewOperation()
  const { setItems } = useEncryptedItems()
  const { showDrawer } = useDrawer()
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

  const openInfoDrawer = () => {
    showDrawer({
      title: 'Información del archivo',
      content: (
        <ul className="space-y-3! text-sm text-gray-700 select-text cursor-default [&>li>p:nth-child(2)]:text-[#888]">
          <li>
            <h3 className="text-base font-semibold text-gray-900">ID</h3>
            <p className="break-all">{item.id}</p>
          </li>

          <li>
            <h3 className="text-base font-semibold text-gray-900">Nombre original</h3>
            <p>{item.originalName || 'Desconocido'}</p>
          </li>

          <li>
            <h3 className="text-base font-semibold text-gray-900">Nombre encriptado</h3>
            <p className="break-all">{item.encryptedName}</p>
          </li>

          <li>
            <h3 className="text-base font-semibold text-gray-900">Ruta original</h3>
            <a className="break-all opacity-50 cursor-not-allowed!" href="#">
              {item.path}
            </a>
          </li>

          <li>
            <h3 className="text-base font-semibold text-gray-900">Ruta actual</h3>
            {(() => {
              const currentPath =
                item.path.substring(
                  0,
                  Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\'))
                ) +
                '\\' +
                item.id +
                (item.type === 'file' ? '.enc' : '')

              return (
                <a
                  className="break-all hover:underline"
                  onClick={() => {
                    window.api.openPath(currentPath)
                  }}
                  href="#"
                >
                  {currentPath}
                </a>
              )
            })()}
          </li>

          <li>
            <h3 className="text-base font-semibold text-gray-900">Oculto</h3>
            <Tag color={item.isHidden ? 'blue' : 'gold'}>{item.isHidden ? 'Sí' : 'No'}</Tag>
          </li>

          <li>
            <h3 className="text-base font-semibold text-gray-900">Tamaño</h3>
            <p>{item.size ? `${formatBytes(item.size)}` : 'No disponible'}</p>
          </li>

          <li>
            <h3 className="text-base font-semibold text-gray-900">Fecha de encriptación</h3>
            <p>
              {item.encryptedAt ? new Date(item.encryptedAt).toLocaleString() : 'No disponible'}
            </p>
          </li>

          {item.extraProps?.backupPath && (
            <li>
              <h3 className="text-base font-semibold text-gray-900">
                Ubicacion de copia de seguridad
              </h3>
              <a
                className="break-all hover:underline!"
                onClick={() => {
                  window.api.openPath(item.extraProps!.backupPath as string)
                }}
                href="#"
              >
                {item.extraProps.backupPath as string}
              </a>
            </li>
          )}
        </ul>
      )
    })
  }

  return [
    <Tooltip
      title={item.isHidden ? 'Mostrar elemento' : 'Ocultar elemento'}
      destroyTooltipOnHide
      mouseEnterDelay={1}
      key="visibility"
    >
      {item.isHidden ? (
        <Icons.EyeInvisibleOutlined onClick={toggleVisibility} />
      ) : (
        <Icons.EyeOutlined onClick={toggleVisibility} />
      )}
    </Tooltip>,
    <Tooltip mouseEnterDelay={1} destroyTooltipOnHide title="Desencriptar" key="decrypt">
      <Popconfirm title="¿Estás seguro de que quieres continuar?" onConfirm={decryptItem}>
        <Icons.KeyOutlined />
      </Popconfirm>
    </Tooltip>,
    <Tooltip mouseEnterDelay={1} destroyTooltipOnHide title="Información" key="info">
      <Icons.InfoCircleOutlined onClick={openInfoDrawer} />
    </Tooltip>
  ]
}

export default useItemCardActions
