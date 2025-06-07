import assert from 'assert'
import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

const description = `Replace a line of an existing file in the workspace.`

export const declaration: FunctionDeclaration = {
  description,
  name: 'editFile',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'The path to the file to edit. The file must exist.',
      },
      lineIndex: {
        type: Type.INTEGER,
        description: 'The index of line to edit. Start from 0.',
      },
      lineContent: {
        type: Type.STRING,
        description:
          'The content to replace the specified line. This can be multiple lines. If this field is not provided, the line will be removed.',
      },
    },
    required: ['filename', 'lineIndex'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      newContent: {
        type: Type.STRING,
        description: 'The content of the file after the edit.',
      },
    },
    required: ['newContent'],
  },
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { filename, lineIndex, lineContent } = functionCall.args
  assert(typeof filename === 'string', `filename must be a string but got ${typeof filename}`)
  assert(typeof lineIndex === 'number', `lineIndex must be a number but got ${typeof lineIndex}`)
  assert(
    typeof lineContent === 'string' || lineContent === undefined,
    `lineContent must be a string or undefined but got ${typeof lineContent}`,
  )
  const absolutePath = path.join(context.workspace, filename)
  const originalContent = await fs.readFile(absolutePath, 'utf-8')

  const lines = originalContent.split('\n')
  core.info(`Read ${lines.length} lines from ${filename}`)
  assert(
    lineIndex >= 0 && lineIndex < lines.length,
    `lineIndex must be between 0 and ${lines.length - 1}, but got ${lineIndex}`,
  )
  core.info(`--- ${filename} L${lineIndex}`)
  core.info(lines[lineIndex])

  if (lineContent !== undefined) {
    core.info(`+++ ${filename} L${lineIndex}`)
    core.info(lineContent)
    lines[lineIndex] = lineContent
  } else {
    lines.splice(lineIndex, 1)
  }

  const newContent = lines.join('\n')
  await fs.writeFile(absolutePath, newContent, 'utf-8')
  const newContentLines = newContent.split('\n')
  core.info(`Wrote ${newContentLines.length} lines to ${filename}`)
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      newContent,
    },
  }
}
