import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** A throwaway repository with one commit and one ignored local config. */
export async function tempRepo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-tapd-git-'))
  await gitExec(dir, ['init', '-q', '-b', 'main'])
  await gitExec(dir, ['config', 'user.email', 'test@example.com'])
  await gitExec(dir, ['config', 'user.name', 'Test'])
  await fs.writeFile(path.join(dir, 'a.txt'), 'one\n')
  await fs.writeFile(path.join(dir, '.gitignore'), 'local.conf\nignored.dir/\n')
  await gitExec(dir, ['add', '.'])
  await gitExec(dir, ['commit', '-q', '-m', 'init'])
  return dir
}

export async function gitExec(cwd, args) {
  const { stdout } = await run('git', args, { cwd })
  return stdout
}

export async function commitAll(cwd, message) {
  await gitExec(cwd, ['add', '-A'])
  await gitExec(cwd, ['commit', '-q', '-m', message])
}

export async function read(file) {
  return fs.readFile(file, 'utf8')
}
