const {
  LOCAL_CONFIG_PATH,
  buildRuntimeModelConfig,
  listRuntimeModelConfigs,
} = require('../../config/ai-models-state');

const listProviderConfigs = () => listRuntimeModelConfigs();

const readProviderConfig = (modelId) => buildRuntimeModelConfig(modelId);

module.exports = {
  LOCAL_CONFIG_PATH,
  listProviderConfigs,
  readProviderConfig,
};
