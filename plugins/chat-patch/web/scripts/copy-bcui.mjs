import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'node_modules/vue3-bcui/dist')
const target = resolve(root, 'public/bcui')

await mkdir(resolve(target, 'css'), { recursive: true })
await mkdir(resolve(target, 'js'), { recursive: true })

await Promise.all([
  copyFile(resolve(source, 'css/style.css'), resolve(target, 'css/style.css')),
  copyFile(resolve(source, 'css/color-light.css'), resolve(target, 'css/color-light.css')),
  copyFile(resolve(source, 'css/color-dark.css'), resolve(target, 'css/color-dark.css')),
  copyFile(resolve(source, 'js/main.js'), resolve(target, 'js/main.js')),
])
