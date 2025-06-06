import * as readFile from './readFile.js'
import * as editFile from './editFile.js'
import * as createTemporaryFile from './createTemporaryFile.js'
import * as exec from './exec.js'
import * as github from '../github.js'
import { WebhookEvent } from '@octokit/webhooks-types'
import { FunctionCall, FunctionResponse } from '@google/genai'

export const functions = [readFile, editFile, createTemporaryFile, exec]

export type Context = {
  workspace: string
  context: github.Context<WebhookEvent>
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  const f = functions.find((f) => f.declaration.name === functionCall.name)
  if (f === undefined) {
    throw new Error(`no such function ${functionCall.name}`)
  }
  return await f.call(functionCall, context)
}
