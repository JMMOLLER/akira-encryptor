import { algorithmOptions, compressionLevels, marks } from '../constants/settingsForm.const'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUserConfig } from '@renderer/hooks/useUserConfig'
import { Form, Modal, Select, Slider, Switch } from 'antd'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { ExportOutlined } from '@ant-design/icons'
import { SliderProps } from 'antd/es/slider'
import { Icon } from '@iconify/react'

interface CustomUserConf
  extends Omit<UserConfig, 'coreReady' | 'hashedPassword' | 'maxThreads' | 'backupPath'> {
  cpuUsage?: number
}

function SettingsForm() {
  const { menuItem, setMenuItem } = useMenuItem()
  const { userConfig, updateUserConfig } = useUserConfig()
  const threadUsage = useMemo(
    () => window.api.calculateUsageFromThreads(userConfig.encryptorConfig.maxThreads),
    [userConfig.encryptorConfig]
  )
  const [cpuUsage, setCpuUsage] = useState(threadUsage)
  const [usageToThreads, setThreads] = useState(userConfig.encryptorConfig.maxThreads)
  const [form] = Form.useForm<CustomUserConf>()

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
      const updatedValues = {
        ...values,
        maxThreads: usageToThreads
      }
      updateUserConfig(updatedValues)
      handleClose()
    },
    [usageToThreads, updateUserConfig, handleClose]
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
      form.setFieldsValue({
        ...userConfig,
        cpuUsage: cpuUsage
      })
    }
  }, [menuItem, userConfig, cpuUsage, form])

  return (
    <Modal
      open={menuItem === 'settings'}
      onCancel={handleClose}
      onOk={handleOk}
      title={
        <h1 className="text-lg font-semibold! inline-flex items-center">
          <Icon icon="fluent-color:settings-16" className="w-12 h-6 -ml-2.5! -mr-1.5!" />
          Configuración
        </h1>
      }
      destroyOnClose
      centered
    >
      <Form
        form={form}
        name="settings"
        initialValues={{
          ...userConfig,
          cpuUsage: cpuUsage
        }}
        onFinish={handleFinish}
        requiredMark={false}
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
            <Slider onChange={handleSliderChange} marks={marks} min={10} styles={sliderStyles} />
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
            <Select className="w-32!" options={algorithmOptions} />
          </Form.Item>
          <p>
            El algoritmo de compresión determina cómo se comprimirán los archivos. Algunos
            algoritmos son más eficientes que otros, pero pueden requerir más recursos del sistema.
          </p>
        </div>

        <div className="p-2.5 [&>p]:text-gray-500 [&>p]:text-xs">
          <Form.Item label="Nivel de compresión" name="compressionLvl" className="mb-1.5!">
            <Select className="w-32!" options={compressionLevels} />
          </Form.Item>
          <p>
            El nivel de compresión determina la cantidad de compresión aplicada a los archivos. Un
            nivel más alto puede reducir el tamaño del archivo, pero también puede aumentar el
            tiempo de compresión y descompresión.
          </p>
        </div>
      </Form>
    </Modal>
  )
}

export default SettingsForm
