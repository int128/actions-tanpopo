import assert from 'assert'
import * as core from '@actions/core'
import * as fs from 'fs/promises'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

const description = `Edit a file in the workspace.`

export const declaration: FunctionDeclaration = {
  description,
  name: 'editFile',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'The path to the file to edit.',
      },
      lineNumber: {
        type: Type.INTEGER,
        description: 'The number of line to replace. Start from 0.',
      },
      content: {
        type: Type.STRING,
        description: 'The content to replace the specified line. This can be multiple lines.',
      },
    },
    required: ['filename', 'lineNumber', 'content'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      totalLines: {
        type: Type.STRING,
        description: 'The total number of lines in the file after the edit.',
      },
    },
    required: ['totalLines'],
  },
}

export const call = async (functionCall: FunctionCall): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { filename, lineNumber, content } = functionCall.args
  assert(typeof filename === 'string', `filename must be a string but got ${typeof filename}`)
  assert(typeof lineNumber === 'number', `lineNumber must be a number but got ${typeof lineNumber}`)
  assert(typeof content === 'string', `content must be a string but got ${typeof content}`)
  const originalFile = await fs.readFile(filename, 'utf-8')
  const lines = originalFile.split('\n')
  assert(
    lineNumber >= 0 && lineNumber < lines.length,
    `lineNumber must be between 0 and ${lines.length - 1}, but got ${lineNumber}`,
  )
  core.info(`Total ${lines.length} lines in ${filename}`)
  core.startGroup(`Original line ${lineNumber} in ${filename}`)
  core.info(lines[lineNumber])
  core.endGroup()
  core.startGroup(`Replacing line ${lineNumber} in ${filename}`)
  core.info(content)
  core.endGroup()
  lines[lineNumber] = content
  await fs.writeFile(filename, lines.join('\n'), 'utf-8')
  core.startGroup(`Wrote ${lines.length} lines to ${filename}`)
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      totalLines: lines.length,
    },
  }
}
