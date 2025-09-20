import * as core from '@actions/core'
import * as exec from '@actions/exec'
import type { RuntimeContext } from '@mastra/core/runtime-context'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { CodingAgentRuntimeContext } from './agent.js'

export const execTool = createTool({
  id: 'exec',
  description: 'Run a shell command. The command is run in the workspace directory.',
  inputSchema: z.object({
    command: z.string().describe('The command to run'),
    args: z.array(z.string()).optional().describe('The arguments to the command'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('The standard output of the command'),
    stderr: z.string().describe('The standard error of the command'),
    exitCode: z.number().describe('The exit code of the command. 0 means success, non-zero means failure'),
  }),
  execute: async ({ context, runtimeContext }) => {
    const typedRuntimeContext: RuntimeContext<CodingAgentRuntimeContext> = runtimeContext
    const workspace = typedRuntimeContext.get('workspace')
    const { stdout, stderr, exitCode } = await exec.getExecOutput(context.command, context.args, {
      cwd: workspace,
      ignoreReturnCode: true,
      env: sanitizeEnv(process.env),
    })
    core.summary.addHeading(`🔧 Exec (exit code ${exitCode})`, 3)
    core.summary.addCodeBlock(`${workspace}> ${context.command} ${context.args?.join(' ') ?? ''}`, 'console')
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

export const sanitizeEnv = (processEnv: NodeJS.ProcessEnv) => {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(processEnv)) {
    if (value && !key.startsWith('GITHUB_') && !key.startsWith('INPUT_')) {
      env[key] = value
    }
  }
  return env
}
