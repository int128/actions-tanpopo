import { Mastra } from '@mastra/core/mastra'
import { codingAgent } from '../coding/agent.ts'

export const mastra = new Mastra({
  agents: {
    codingAgent,
  },
})
