import { Command, Context } from 'koishi'

export interface OriginalCommandInfo {
  name: string
  aliases: string[]
}

export function normalizeCommandName(name: string): string {
  return Command.normalize(name.trim())
}

export function collectOriginalCommands(ctx: Context, excluded: ReadonlySet<string>): OriginalCommandInfo[] {
  const result: OriginalCommandInfo[] = []

  for (const command of ctx.$commander._commandList) {
    const normalized = normalizeCommandName(command.name)
    if (excluded.has(normalized)) continue

    result.push({
      name: command.name,
      aliases: Object.keys(command._aliases)
        .map((name) => normalizeCommandName(name))
        .filter((name) => name !== normalized),
    })
  }

  return result
}

export function collectAllCommandNames(ctx: Context): Set<string> {
  const names = new Set<string>()

  for (const command of ctx.$commander._commandList) {
    names.add(normalizeCommandName(command.name))
    for (const alias of Object.keys(command._aliases)) {
      names.add(normalizeCommandName(alias))
    }
  }

  return names
}

export function findOriginalCommand(
  ctx: Context,
  excluded: ReadonlySet<string>,
  name: string,
): OriginalCommandInfo | undefined {
  const normalized = normalizeCommandName(name)
  return collectOriginalCommands(ctx, excluded).find((command) => {
    return normalizeCommandName(command.name) === normalized
  })
}

export function isKnownCommandName(ctx: Context, name: string): boolean {
  return collectAllCommandNames(ctx).has(normalizeCommandName(name))
}
