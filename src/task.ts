import * as core from '@actions/core'
import * as path from 'path'
import { Context } from './github.js'
import { WebhookEvent } from '@octokit/webhooks-types'
import { query } from '@anthropic-ai/claude-code'

export const applyTask = async (taskDir: string, workspace: string, context: Context<WebhookEvent>) => {
  const queryResponse = query({
    prompt: `You are an agent running in a GitHub Actions workflow.
Follow the task instructions at ${path.join(taskDir, 'README.md')}.
Your responsibility is to apply the task in the workspace at ${workspace}.
After applying the task, a pull request will be automatically created with the changes.
You can create temporary files into the directory ${context.runnerTemp}.
`,
    options: {
      cwd: workspace,
      allowedTools: [],
      pathToClaudeCodeExecutable: `${context.workspace}/node_modules/@anthropic-ai/claude-code/cli.js`,
    },
  })
  for await (const message of queryResponse) {
    core.info(`🤖: ${JSON.stringify(message)}`)
  }
}
