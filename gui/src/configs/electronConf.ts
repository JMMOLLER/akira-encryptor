import ensureBackupFolder from '@gui/utils/ensureBackupFolder'
import { Conf } from 'electron-conf/main'

const CONF = new Conf<Partial<ConfStoreType>>({
  defaults: {
    userConfig: {
      coreReady: false,
      autoBackup: true,
      backupPath: ensureBackupFolder(),
      hashedPassword: undefined
    }
  },

  schema: {
    type: 'object',
    properties: {
      userConfig: {
        type: 'object',
        nullable: true,
        properties: {
          hashedPassword: {
            type: 'string',
            nullable: true
          },
          coreReady: {
            type: 'boolean',
            default: false
          },
          autoBackup: {
            type: 'boolean',
            default: true
          },
          backupPath: {
            type: 'string',
            default: ensureBackupFolder()
          },
        },
        required: ['coreReady', 'autoBackup', 'backupPath']
      }
    }
  }
}) // --> Que dolor de cabeza es definir esta vaina. 🫠

// set initial values
CONF.set('userConfig.coreReady', false)
// register the renderer listener
CONF.registerRendererListener()

export default CONF as Conf<ConfStoreType>
