import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const execTool = createTool({
  id: 'exec',
  description: 'Run a shell command. The command is run in the current directory.',
  inputSchema: z.object({
    command: z.string().describe('The command to run'),
    args: z.array(z.string()).optional().describe('The arguments to the command'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('The standard output of the command. If the output is large, it may be truncated.'),
    stderr: z.string().describe('The standard error of the command. If the error is large, it may be truncated.'),
    exitCode: z.number().describe('The exit code of the command. 0 means success, non-zero means failure'),
  }),
  execute: async ({ context }) => {
    const { stdout, stderr, exitCode } = await exec.getExecOutput(context.command, context.args, {
      ignoreReturnCode: true,
      env: sanitizeEnv(process.env),
    })
    core.summary.addHeading(`🔧 Exec (exit code ${exitCode})`, 3)
    core.summary.addCodeBlock(`${process.cwd()}> ${context.command} ${context.args?.join(' ') ?? ''}`, 'console')
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
