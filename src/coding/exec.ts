import assert from 'node:assert'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const execTool = createTool({
  id: 'exec',
  description: 'Execute a command in the current directory. such as ls, cp or mv',
  inputSchema: z.object({
    commandLine: z.array(z.string()).min(1).describe('The command and arguments.'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('The standard output of the command. If the output is too large, it may be truncated.'),
    stderr: z.string().describe('The standard error of the command. If the error is too large, it may be truncated.'),
    exitCode: z.number().describe('The exit code of the command. 0 means success, non-zero means failure'),
  }),
  execute: async ({ context }) => {
    const command = context.commandLine[0]
    assert(command, 'commandLine[0] is required')
    const args = context.commandLine.slice(1)
    const { stdout, stderr, exitCode } = await exec.getExecOutput(command, args, {
      ignoreReturnCode: true,
      env: sanitizeEnv(process.env),
    })
    core.summary.addHeading(`🔧 Exec (exit code ${exitCode})`, 3)
    core.summary.addCodeBlock(`${process.cwd()}> ${context.commandLine.join(' ')}`, 'console')
    if (stdout) {
      core.summary.addCodeBlock(stdout)
    }
    if (stderr) {
      core.summary.addCodeBlock(stderr)
    }
    return {
      stdout: truncateString(stdout, 8000),
      stderr: truncateString(stderr, 8000),
      exitCode,
    }
  },
})

const truncateString = (str: string, maxLength: number) => {
  if (str.length <= maxLength) {
    return str
  }
  return `${str.slice(0, maxLength)}\n...truncated`
}

export const sanitizeEnv = (processEnv: NodeJS.ProcessEnv) => {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(processEnv)) {
    if (value && !key.startsWith('GITHUB_') && !key.startsWith('INPUT_')) {
      env[key] = value
    }
  }
  return env
}
