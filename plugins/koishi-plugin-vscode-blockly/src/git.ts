import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { GitStatus } from './types'

const execFileAsync = promisify(execFile)

export async function getGitStatus(cwd: string): Promise<GitStatus> {
  try {
    await execFileAsync('git', ['--version'])
  } catch {
    return { available: false, branch: '', status: [] }
  }

  try {
    const [branchResult, statusResult] = await Promise.all([
      execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd }),
      execFileAsync('git', ['status', '--short'], { cwd }),
    ])
    return {
      available: true,
      branch: branchResult.stdout.trim(),
      status: statusResult.stdout.split(/\r?\n/).filter(Boolean),
    }
  } catch (error) {
    return {
      available: true,
      branch: '',
      status: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
