import ensureBackupFolder from '@gui/utils/ensureBackupFolder'
import calculateThreads from '@gui/utils/calculateThreads'
import { Conf } from 'electron-conf/main'

const CONF = new Conf<Partial<ConfStoreType>>({
  defaults: {
    userConfig: {
      coreReady: false,
      autoBackup: true,
      maxThreads: calculateThreads(50),
      backupPath: ensureBackupFolder(),
      compressionAlgorithm: '-m0=lzma2',
      hashedPassword: undefined,
      compressionLvl: '-mx=5'
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
          maxThreads: {
            type: 'number',
            default: calculateThreads(50)
          },
          compressionAlgorithm: {
            type: 'string',
            default: '-m0=lzma2'
          },
          compressionLvl: {
            type: 'string',
            default: '-mx=5'
          }
        },
        required: ['coreReady', 'autoBackup', 'backupPath', 'maxThreads']
      }
    }
  }
}) // --> Que dolor de cabeza es definir esta vaina. 🫠

// set initial values
CONF.set('userConfig.coreReady', false)
// register the renderer listener
CONF.registerRendererListener()

export default CONF as Conf<ConfStoreType>
