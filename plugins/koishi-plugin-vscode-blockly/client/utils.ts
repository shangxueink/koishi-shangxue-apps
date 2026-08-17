import type { FileNode } from './types'

export function extractCode(text: string) {
  const match = /```(?:ts|typescript|js|javascript)?\s*\n([\s\S]*?)```/.exec(text)
  return (match?.[1] ?? text).trim()
}

export function flattenFiles(files: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of files) {
    if (node.type === 'file') {
      result.push(node)
    } else if (node.children) {
      result.push(...flattenFiles(node.children))
    }
  }
  return result
}

export function normalizeScriptName(input: string) {
  const name = input.trim().replace(/\s+/g, '-')
  if (!name) return ''
  if (/\.(ts|js)$/.test(name)) return name
  return `${name}.ts`
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}
