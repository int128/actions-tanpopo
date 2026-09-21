import { Mastra } from '@mastra/core/mastra'
import { createCodingAgent } from '../coding/agent.ts'

export const mastra = new Mastra({
  agents: {
    codingAgent: createCodingAgent(
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
    ),
  },
})
