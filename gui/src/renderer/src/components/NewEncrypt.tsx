import { Button, FloatButton, Form, Input, InputProps, Modal, Space } from 'antd'
import { usePendingEncryption } from '@renderer/hooks/usePendingEncrypt'
import { useMenuItem } from '@renderer/hooks/useMenuItem'
import { PlusOutlined } from '@ant-design/icons'
import useApp from 'antd/es/app/useApp'
import { useState } from 'react'
import uid from 'tiny-uid'

function NewEncrypt() {
  const [status, setStatus] = useState<InputProps['status']>('')
  const { setPendingEncryptedItems } = usePendingEncryption()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pathVal, setPathVal] = useState('')
  const message = useApp().message
  const { item } = useMenuItem()

  const showModal = () => {
    setIsModalOpen(true)
    handleReset()
  }

  const handleOk = () => {
    if (item === 'settings') {
      message.error('No se puede encriptar desde la pantalla de configuración.')
      return
    }

    const id = uid()

    setPendingEncryptedItems((prev) => {
      return new Map(prev).set(id, {
        type: item === 'files' ? 'file' : 'folder',
        status: 'loading',
        percent: 0
      })
    })
    window.electron.ipcRenderer.send('encrypt-file', {
      filePath: pathVal,
      password: 'mypassword', // TODO: Get password from input
      itemId: id
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
