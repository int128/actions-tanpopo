import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const execTool = createTool({
  id: 'exec',
  description: 'Run a shell command in the workspace. Typical Linux commands are available.',
  inputSchema: z.object({
    command: z.string().describe('The command to run'),
    args: z.array(z.string()).optional().describe('The arguments to the command'),
    cwd: z.string().describe('The current working directory to run the command in'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('The standard output of the command'),
    stderr: z.string().describe('The standard error of the command'),
    exitCode: z.number().describe('The exit code of the command. 0 means success, non-zero means failure'),
  }),
  execute: async ({ context }) => {
    const { stdout, stderr, exitCode } = await exec.getExecOutput(context.command, context.args, {
      cwd: context.cwd,
      ignoreReturnCode: true,
    })
    core.summary.addHeading(`🤖 Exec (exit code ${exitCode})`, 3)
    core.summary.addCodeBlock(`${context.cwd}> ${context.command} ${context.args?.join(' ') ?? ''}`, 'console')
    if (stdout) {
      core.summary.addCodeBlock(stdout)
    }
    if (stderr) {
      core.summary.addCodeBlock(stderr)
    }
    return {
      stdout,
      stderr,
      exitCode,
    }
  },
})
