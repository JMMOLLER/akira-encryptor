import { Button, Form, Modal, Popconfirm, Select, Slider, Switch } from 'antd'
import { usePendingOperation } from '@renderer/hooks/usePendingOperation'
import { useEncryptedItems } from '@renderer/hooks/useEncryptedItems'
import { useNewOperation } from '@renderer/hooks/useNewOperation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUserConfig } from '@renderer/hooks/useUserConfig'
import { useCountdown } from '@renderer/hooks/useContdown'
import * as consts from '../constants/settingsForm.const'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { ExportOutlined } from '@ant-design/icons'
import { SliderProps } from 'antd/es/slider'
import { Icon } from '@iconify/react'

type OmitedUserConfig = Omit<
  UserConfig,
  'coreReady' | 'hashedPassword' | 'backupPath' | 'encryptorConfig'
>
interface CustomUserConf extends OmitedUserConfig {
  cpuUsage?: number
}

function SettingsForm() {
  const { menuItem, setMenuItem } = useMenuItem()
  const { userConfig, updateUserConfig } = useUserConfig()
  const encryptorConfig = useMemo(() => userConfig.encryptorConfig, [userConfig.encryptorConfig])
  const threadUsage = useMemo(
    () => window.api.calculateUsageFromThreads(encryptorConfig.maxThreads!),
    [encryptorConfig]
  )
  const [usageToThreads, setThreads] = useState(encryptorConfig.maxThreads)
  const { encryptedItems: items } = useEncryptedItems()
  const encryptedItems = useMemo(() => items || { size: 0 }, [items])
  const [cpuUsage, setCpuUsage] = useState(threadUsage)
  const { hasBackupInProgress } = useNewOperation()
  const { pendingItems } = usePendingOperation()
  const { counter, setActive } = useCountdown(5)

  const [form] = Form.useForm<CustomUserConf>()
  const pwdDescription = useMemo(
    () => (
      <span className="max-w-80 block">
        {encryptedItems.size > 0
          ? 'Aún tiene elementos cifrados, descífrelos antes si no quiere perder los datos.'
          : 'Esta acción no se puede revertir, elimina los backups y no restablece la configuración al por defecto.'}
      </span>
    ),
    [encryptedItems]
  )

  const getGradientColor = useCallback(() => {
    const startColor = [24, 144, 255] // Azul
    const middleColor = [135, 208, 104] // Verde
    const endColor = [232, 114, 102] // Rojo

    let color: number[]

    if (cpuUsage <= 50) {
      const ratio = cpuUsage / 50
      color = startColor.map((start, i) => {
        const end = middleColor[i]
        return Math.round(start + (end - start) * ratio)
      })
    } else {
      const ratio = (cpuUsage - 50) / 50
      color = middleColor.map((start, i) => {
        const end = endColor[i]
        return Math.round(start + (end - start) * ratio)
      })
    }

    return `rgb(${color.join(',')})`
  }, [cpuUsage])

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      window.api.openPath(userConfig.backupPath)
    },
    [userConfig.backupPath]
  )

  const handleClose = useCallback(() => {
    setMenuItem()
  }, [setMenuItem])

  const handleOk = useCallback(() => {
    form.submit()
  }, [form])

  const handleFinish = useCallback(
    async (values: CustomUserConf) => {
      delete values.cpuUsage
      updateUserConfig({
        ...values,
        encryptorConfig: {
          ...encryptorConfig,
          maxThreads: usageToThreads
        }
      })
      handleClose()
    },
    [usageToThreads, encryptorConfig, updateUserConfig, handleClose]
  )

  const handleSliderChange = useCallback(
    (value: number) => {
      const res = window.api.calculateThreads(value)
      setThreads(res)
      setCpuUsage(value)
    },
    [setCpuUsage, setThreads]
  )

  const sliderStyles: SliderProps['styles'] = useMemo(() => {
    return {
      track: {
        background: 'transparent'
      },
      tracks: {
        background: `linear-gradient(to right, ${getGradientColor()} 0%, ${getGradientColor()} 100%)`
      }
    }
  }, [getGradientColor])

  useEffect(() => {
    if (menuItem !== 'settings') {
      setCpuUsage(threadUsage)
      form.setFieldsValue({
        autoBackup: userConfig.autoBackup,
        cpuUsage,
        compressionAlgorithm: userConfig.compressionAlgorithm,
        compressionLvl: userConfig.compressionLvl
      })
    }
  }, [menuItem, userConfig, cpuUsage, form, threadUsage])

  return (
    <Modal
      open={menuItem === 'settings'}
      onCancel={handleClose}
      destroyOnHidden
      onOk={handleOk}
      title={
        <h1 className="text-lg font-semibold! inline-flex items-center">
          <Icon icon="fluent-color:settings-16" className="w-12 h-6 -ml-2.5! -mr-1.5!" />
          Configuración
        </h1>
      }
      centered
    >
      <Form<CustomUserConf>
        form={form}
        name="settings"
        requiredMark={false}
        onFinish={handleFinish}
      >
        <div className="border-b border-black/10 p-1.5 [&>p]:text-gray-500 [&>p]:text-xs">
          <Form.Item
            label={
              <span className="inline-flex items-center gap-1.5">
                <p>Copia de seguridad automática</p>
                <a onClick={handleAnchorClick} href="#">
                  <ExportOutlined />
                </a>
              </span>
            }
            className="mb-0!"
            name="autoBackup"
          >
            <Switch checkedChildren="Activado" unCheckedChildren="Desactivado" />
          </Form.Item>
          <p>Habilita o deshabilita la copia de seguridad automática de los archivos.</p>
        </div>

        <div className="border-b border-black/10 p-1.5 [&>p]:text-gray-500 [&>p]:text-xs">
          <Form.Item
            label="Uso de CPU"
            className="-mb-1.5!"
            name="cpuUsage"
            rules={[
              { required: true, message: 'El uso de CPU es obligatorio.' },
              { type: 'number', min: 10, message: 'El uso de CPU no puede ser menor al 10%.' }
            ]}
          >
            <Slider
              onChange={handleSliderChange}
              marks={consts.marks}
              min={10}
              styles={sliderStyles}
            />
          </Form.Item>
          <p>
            Ajusta el porcentaje de uso de la CPU para la compresión y descompresión de archivos. Un
            mayor uso puede mejorar el rendimiento, pero también limitar la capacidad de respuesta
            del sistema mientras se realizan las operaciones.
          </p>
        </div>

        <div className="border-b border-black/10 p-2.5 [&>p]:text-gray-500 [&>p]:text-xs">
          <Form.Item
            label="Algoritmo de compresión"
            name="compressionAlgorithm"
            className="mb-1.5!"
          >
            <Select className="w-32!" options={consts.algorithmOptions} />
          </Form.Item>
          <p>
            El algoritmo de compresión determina cómo se comprimirán los archivos. Algunos
            algoritmos son más eficientes que otros, pero pueden requerir más recursos del sistema.
          </p>
        </div>

        <div className="border-b border-black/10 p-2.5 [&>p]:text-gray-500 [&>p]:text-xs">
          <Form.Item label="Nivel de compresión" name="compressionLvl" className="mb-1.5!">
            <Select className="w-32!" options={consts.compressionLevels} />
          </Form.Item>
          <p>
            El nivel de compresión determina la cantidad de compresión aplicada a los archivos. Un
            nivel más alto puede reducir el tamaño del archivo, pero también puede aumentar el
            tiempo de compresión y descompresión.
          </p>
        </div>

        <div className="p-2.5 [&>p]:text-gray-500 [&>p]:text-xs flex gap-5">
          <Popconfirm
            title="¿Estás seguro de restablecer la contraseña?"
            description={pwdDescription}
            onOpenChange={(open) => {
              if (encryptedItems.size > 0) {
                setActive(open)
              }
            }}
            onConfirm={() => {
              window.api.resetAction('reset-pwd')
            }}
            okText={counter > 0 ? `Aceptar (${counter})` : 'Aceptar'}
            disabled={pendingItems.size > 0 || hasBackupInProgress}
            okButtonProps={{ loading: counter > 0 }}
          >
            <Button
              disabled={pendingItems.size > 0 || hasBackupInProgress}
              className="w-full group"
              type="primary"
              danger
            >
              <Icon
                icon="fluent-color:person-key-32"
                className="group-disabled:grayscale"
                width="20"
                height="20"
              />
              Restablecer Contraseña
            </Button>
          </Popconfirm>
        </div>
      </Form>
    </Modal>
  )
}

export default SettingsForm
