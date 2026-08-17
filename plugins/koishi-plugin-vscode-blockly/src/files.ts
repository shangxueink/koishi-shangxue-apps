import { Context } from 'koishi'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve, isAbsolute } from 'node:path'
import { allowedExtensions, scriptsDirName } from './constants'
import { Store } from './store'
import { FileNode, ScriptContent, SearchMatch } from './types'

function normalizePath(path: string) {
  const value = path.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!value || value.includes('..')) throw new Error('非法脚本路径')
  return value
}

function validateFile(path: string) {
  const value = normalizePath(path)
  if (!allowedExtensions.includes(extname(value))) {
    throw new Error('只支持 .ts 或 .js 脚本')
  }
  if (basename(value).startsWith('.')) throw new Error('不支持隐藏文件')
  return value
}

export async function listScripts(ctx: Context, store: Store): Promise<FileNode[]> {
  await store.ensure()
  const state = await store.getState()
  const enabled = new Set(state.enabled)
  return traverse(store.scriptsRoot, '', enabled)
}

export async function readScript(ctx: Context, store: Store, input: string): Promise<ScriptContent> {
  const path = validateFile(input)
  const filename = store.resolveScript(path)
  const content = await readFile(filename, 'utf8')
  const state = await store.getState()
  return {
    path,
    name: basename(path),
    content,
    language: extname(path) === '.ts' ? 'typescript' : 'javascript',
    enabled: state.enabled.includes(path),
  }
}

export async function createScript(ctx: Context, store: Store, input: string, content = '') {
  const path = validateFile(input)
  const filename = store.resolveScript(path)
  await mkdir(store.scriptsRoot, { recursive: true })
  await writeFile(filename, content, 'utf8')
  return path
}

export async function writeScript(ctx: Context, store: Store, input: string, content: string) {
  const path = validateFile(input)
  const filename = store.resolveScript(path)
  await writeFile(filename, content, 'utf8')
  return path
}

export async function renameScript(ctx: Context, store: Store, oldInput: string, newInput: string) {
  const oldPath = validateFile(oldInput)
  const newPath = validateFile(newInput)
  if (oldPath === newPath) return newPath
  await store.renameScript(oldPath, newPath)
  return newPath
}

export async function deleteScript(ctx: Context, store: Store, input: string) {
  const path = validateFile(input)
  const filename = store.resolveScript(path)
  await rm(filename, { force: true })
  await store.removeEnabled(path)
  return path
}

export async function searchScripts(ctx: Context, store: Store, query: string): Promise<SearchMatch[]> {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return []
  const files: string[] = []
  await collectScriptFiles(store.scriptsRoot, '', files)
  const result: SearchMatch[] = []
  for (const path of files) {
    const filename = store.resolveScript(path)
    const content = await readFile(filename, 'utf8')
    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(keyword)) {
        result.push({
          path,
          line: index + 1,
          content: line.trim().slice(0, 200),
        })
      }
    })
  }
  return result.slice(0, 200)
}

async function collectScriptFiles(root: string, rel: string, result: string[]) {
  const current = join(root, rel)
  const entries = await readdir(current, { withFileTypes: true })
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      await collectScriptFiles(root, childRel, result)
    } else if (entry.isFile() && allowedExtensions.includes(extname(entry.name))) {
      result.push(childRel)
    }
  }
}

async function traverse(root: string, rel: string, enabled: Set<string>): Promise<FileNode[]> {
  const current = join(root, rel)
  const entries = await readdir(current, { withFileTypes: true })
  const result: FileNode[] = []
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: childRel,
        type: 'directory',
        children: await traverse(root, childRel, enabled),
      })
    } else if (entry.isFile() && allowedExtensions.includes(extname(entry.name))) {
      result.push({
        name: entry.name,
        path: childRel,
        type: 'file',
        enabled: enabled.has(childRel),
      })
    }
  }
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
