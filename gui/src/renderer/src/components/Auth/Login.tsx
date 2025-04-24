import { LockOutlined } from '@ant-design/icons'
import { Button, Form, Input } from 'antd'

interface LoginProps {
  handleClose?: (values: Record<string, unknown>) => void
}

function Login({ handleClose }: LoginProps) {
  const [form] = Form.useForm()

  const onFinish = (values: { password: string }) => {
    console.log('Received values of form: ', values)
    handleClose?.(values)
  }

  return (
    <Form className="-mb-5!" form={form} name="login" onFinish={onFinish}>
      <Form.Item
        rules={[
          {
            message: 'Por favor ingrese su contraseña',
            required: true
          }
        ]}
        name="password"
        hasFeedback
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
      </Form.Item>

      <Form.Item>
        <Button className="mt-2!" type="primary" htmlType="submit" block>
          Submit
        </Button>
      </Form.Item>
    </Form>
  )
}

export default Login
