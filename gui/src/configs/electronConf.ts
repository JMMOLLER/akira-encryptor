import ensureBackupFolder from '@utils/ensureBackupFolder'
import calculateThreads from '@utils/calculateThreads'
import { Conf } from 'electron-conf/main'

const CONF = new Conf<Partial<ConfStoreType>>({
  defaults: {
    userConfig: {
      coreReady: false,
      autoBackup: true,
      backupPath: ensureBackupFolder(),
      compressionAlgorithm: '-m0=lzma2',
      hashedPassword: undefined,
      compressionLvl: '-mx=5',
      encryptorConfig: {
        maxThreads: calculateThreads(50),
        libraryPath: undefined, // This will be set later if needed
        allowExtraProps: true,
        enableLogging: false,
        minDelayPerStep: 0,
        encoding: 'base64',
        silent: true
      }
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
          encryptorConfig: {
            type: 'object',
            nullable: false,
            properties: {
              maxThreads: {
                type: 'number',
                nullable: true,
                default: calculateThreads(50)
              },
              allowExtraProps: {
                type: 'boolean',
                nullable: true,
                default: true
              },
              enableLogging: {
                type: 'boolean',
                nullable: true,
                default: false
              },
              encoding: {
                type: 'string',
                nullable: true,
                default: 'base64'
              },
              minDelayPerStep: {
                type: 'number',
                default: 0,
                nullable: true
              },
              silent: {
                type: 'boolean',
                nullable: true,
                default: true
              },
              libraryPath: {
                type: 'string',
                nullable: true,
                default: undefined // This will be set later if needed
              }
            }
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
        required: ['coreReady', 'autoBackup', 'backupPath', 'encryptorConfig']
      }
    }
  }
}) // --> Que dolor de cabeza es definir esta vaina. 🫠

// set initial values
CONF.set('userConfig.coreReady', false)
// debug configuration changes
CONF.onDidAnyChange((changes) => {
  console.log('Configuration changes detected:', changes)
})
// register the renderer listener
CONF.registerRendererListener()

export default CONF as Conf<ConfStoreType>
