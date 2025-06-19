import CONF from '@configs/electronConf'

export default function getCompressionOptions() {
  const config = CONF.get('userConfig')
  return {
    maxThreads: config.encryptorConfig.maxThreads || 1,
    algorithm: config.compressionAlgorithm,
    level: config.compressionLvl
  }
}
