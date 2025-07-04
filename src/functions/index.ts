import * as core from '@actions/core'
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
  try {
    return await f.call(functionCall, context)
  } catch (error: unknown) {
    core.error(`Error while calling ${functionCall.name}: ${String(error)}`)
    return {
      id: functionCall.id,
      name: functionCall.name,
      response: {
        error: String(error),
      },
    }
  }
}
