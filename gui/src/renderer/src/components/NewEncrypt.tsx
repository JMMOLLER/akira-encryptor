import { Button, FloatButton, Form, Input, InputProps, Modal, Space } from 'antd'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { PlusOutlined } from '@ant-design/icons'
import { useState } from 'react'

function NewEncrypt() {
  const [status, setStatus] = useState<InputProps['status']>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pathVal, setPathVal] = useState('')
  const { item } = useMenuItem()

  const showModal = () => {
    setIsModalOpen(true)
    handleReset()
  }

  const handleOk = () => {
    window.electron.ipcRenderer.send('ping')
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
      title: `Seleccionar ${item === 'files' ? 'archivo' : 'carpeta'}`,
      properties: ['openFile']
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
        title={`Encriptar ${item === 'files' ? 'Nuevo Archivo' : 'Nueva Carpeta'}`}
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
                ? `Por favor seleccione ${item === 'files' ? 'un archivo' : 'una carpeta'}`
                : ''
            }
            label={`Ingrese la ruta ${item === 'files' ? 'del archivo' : 'de la carpeta'}::`}
            wrapperCol={{ span: 24 }}
            labelCol={{ span: 24 }}
            className="inline-flex"
            validateStatus={status}
            name="path"
          >
            <Space.Compact className="w-full">
              <Input
                placeholder={`Seleccionar ${item === 'files' ? 'archivo' : 'carpeta'}`}
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
