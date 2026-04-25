import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { sanitizeEnv } from './sanitize.ts'

export const lsTool = createTool({
  id: 'ls',
  description: 'List files in the workspace using git-ls-files.',
  inputSchema: z.object({
    patterns: z.array(z.string()).describe('The patterns to list. If empty, list all files.'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('The standard output of git-ls-files.'),
  }),
  execute: async (inputData) => {
    const args = [`ls-files`, `--`, ...inputData.patterns]
    const { stdout } = await exec.getExecOutput(`git`, args, {
      env: sanitizeEnv(process.env),
    })
    core.summary.addHeading(`🔧 LS`, 3)
    core.summary.addCodeBlock(`git ${args.join(' ')}`, 'bash')
    core.summary.addCodeBlock(stdout)
    return {
      stdout,
    }
  },
})
