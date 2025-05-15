import { Button, FloatButton, Form, Input, InputProps, Modal, Space } from 'antd'
import { useNewOperation } from '@renderer/hooks/useNewOperation'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { PlusOutlined } from '@ant-design/icons'
import useApp from 'antd/es/app/useApp'
import { useState } from 'react'
import uid from 'tiny-uid'

function NewEncrypt() {
  const [status, setStatus] = useState<InputProps['status']>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pathVal, setPathVal] = useState('')
  const { newEncrypt } = useNewOperation()
  const { menuItem } = useMenuItem()
  const message = useApp().message

  const showModal = () => {
    setIsModalOpen(true)
    handleReset()
  }

  const handleOk = () => {
    if (menuItem === 'settings') {
      message.error('No se puede encriptar desde la pantalla de configuración.')
      return
    }

    const id = uid()

    newEncrypt({
      actionFor: menuItem === 'files' ? 'file' : 'folder',
      srcPath: pathVal,
      id
    })
    setIsModalOpen(false)
  }

  const handleCancel = () => {
    setIsModalOpen(false)
  }

  const handleReset = () => {
    setPathVal('')
    setStatus('')
  }

  const handleClick = async () => {
    // Reset status
    handleReset()

    // Open file explorer
    const archivo = await window.api.openExplorer({
      title: `Seleccionar ${menuItem === 'files' ? 'archivo' : 'carpeta'}`,
      properties: menuItem === 'files' ? ['openFile'] : ['openDirectory']
    })
    if (!archivo) {
      setStatus('error')
    } else {
      setPathVal(archivo as string)
      setStatus('')
    }
  }

  return (
    <>
      <FloatButton
        tooltip="Añadir archivo"
        icon={<PlusOutlined />}
        onClick={showModal}
        type="primary"
      />
      <Modal
        title={`Encriptar ${menuItem === 'files' ? 'Nuevo Archivo' : 'Nueva Carpeta'}`}
        okButtonProps={{ disabled: status === 'error' || pathVal === '' }}
        onCancel={handleCancel}
        open={isModalOpen}
        onOk={handleOk}
        centered
      >
        <Form name="basic" className="[&_.ant-form-item-has-error]:mb-0! *:mb-4!">
          <Form.Item
            help={
              status === 'error'
                ? `Por favor seleccione ${menuItem === 'files' ? 'un archivo' : 'una carpeta'}`
                : ''
            }
            label={`Ingrese la ruta ${menuItem === 'files' ? 'del archivo' : 'de la carpeta'}::`}
            wrapperCol={{ span: 24 }}
            labelCol={{ span: 24 }}
            className="inline-flex"
            validateStatus={status}
            name="path"
          >
            <Space.Compact className="w-full">
              <Input
                placeholder={`Seleccionar ${menuItem === 'files' ? 'archivo' : 'carpeta'}`}
                value={pathVal}
                readOnly
              />
              <Button onClick={handleClick} type="primary">
                Seleccionar
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default NewEncrypt
