import CONF from '@gui/configs/electronConf'

export default function getCompressionOptions() {
  const config = CONF.get('userConfig')
  return {
    algorithm: config.compressionAlgorithm,
    level: config.compressionLvl,
    maxThreads: config.maxThreads
  }
}
