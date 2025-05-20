import useApp from 'antd/es/app/useApp'

function useInitializeCore() {
  const { notification } = useApp()

  const initializeCore = async (password: string) => {
    const res = await window.api.initEncryptor(password)

    if (res.error) {
      notification.error({
        description: res.error,
        message: 'Error',
        duration: 5
      })
    }
    console.log('Encryptor initialized', res)

    return res
  }

  return { initializeCore }
}

export default useInitializeCore
