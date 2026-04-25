import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { sanitizeEnv } from './sanitize.ts'

export const grepTool = createTool({
  id: 'grep',
  description: 'Grep a pattern in the workspace using git-grep.',
  inputSchema: z.object({
    pattern: z.string().describe('The pattern to grep.'),
    ignoreCase: z.boolean().optional().describe('Whether to ignore case when grepping.'),
    pathspecs: z.array(z.string()).describe('The pathspecs to grep. If empty, grep all files.'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('The standard output of git-grep.'),
  }),
  execute: async (inputData) => {
    const args = [`grep`]
    if (inputData.ignoreCase) {
      args.push(`-i`)
    }
    args.push(inputData.pattern, '--', ...inputData.pathspecs)
    const { stdout } = await exec.getExecOutput(`git`, args, {
      env: sanitizeEnv(process.env),
    })
    core.summary.addHeading(`🔧 Grep`, 3)
    core.summary.addCodeBlock(`git ${args.join(' ')}`, 'bash')
    core.summary.addCodeBlock(stdout)
    return {
      stdout,
    }
  },
})
