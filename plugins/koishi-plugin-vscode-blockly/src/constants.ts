export const pluginName = 'vscode-blockly'

export const packageName = 'koishi-plugin-vscode-blockly'

export const dataDirName = 'vscode-blockly'

export const scriptsDirName = 'scripts'

export const configFileName = 'config.json'

export const stateFileName = 'state.json'

export const allowedExtensions = ['.ts', '.js']

export const defaultConfig = {
  apiBase: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-v4-flash',
  temperature: 0.2,
  debug: false,
} as const
