import { LockOutlined } from '@ant-design/icons'
import { Button, Form, Input } from 'antd'

interface RegisterProps {
  handleClose?: (values: Record<string, unknown>) => void
}

function Register({ handleClose }: RegisterProps) {
  const [form] = Form.useForm()

  const onFinish = (values: { password: string }) => {
    console.log('Received values of form: ', values)
    handleClose?.(values)
  }

  return (
    <Form className="-mb-5!" form={form} name="register" onFinish={onFinish}>
      <Form.Item
        rules={[
          {
            required: true,
            min: 4,
            validator: (_, value) => {
              if (!value) {
                return Promise.reject(new Error('Por favor ingrese su contraseña'))
              } else if (value.length < 4) {
                return Promise.reject(new Error('La contraseña debe tener al menos 4 caracteres'))
              }
              return Promise.resolve()
            }
          }
        ]}
        name="password"
        hasFeedback
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
      </Form.Item>

      <Form.Item
        name="confirm-password"
        dependencies={['password']}
        hasFeedback
        rules={[
          { required: true, message: 'Por favor confirme su contraseña' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }
              return Promise.reject(new Error('Las contraseñas no coinciden'))
            }
          })
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Confirmar Contraseña" />
      </Form.Item>

      <Form.Item>
        <Button className="mt-2!" type="primary" htmlType="submit" block>
          Submit
        </Button>
      </Form.Item>
    </Form>
  )
}

export default Register
