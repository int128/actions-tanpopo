import { Mastra } from '@mastra/core/mastra'
import { CodingAgent } from '../coding/agent.ts'

export const mastra = new Mastra({
  agents: {
    codingAgent: new CodingAgent(
      {
        eventName: 'pull_request',
        repo: {
          owner: 'int128',
          repo: 'actions-tanpopo',
        },
        runId: 0,
        actor: 'coding-agent',
        serverUrl: 'https://github.com',
        runnerTemp: '/tmp',
        workspace: '/tmp/workspace',
        payload: {},
      },
      {
        repository: {
          owner: 'int128',
          repo: 'actions-tanpopo',
        },
        workspace: '/tmp/workspace',
      },
    ).agent,
  },
})
