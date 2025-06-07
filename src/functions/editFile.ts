import assert from 'assert'
import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

const description = `Edit a line of an existing file in the workspace.`

export const declaration: FunctionDeclaration = {
  description,
  name: 'editFile',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'The path to the file to be edited. The file must already exist in the workspace.',
      },
      rowIndex: {
        type: Type.INTEGER,
        description: 'The 1-based index of the line to edit. For example, to edit the first line, set this to 1.',
      },
      newLine: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          description: 'The content of the line. Do not include a newline character at the end.',
        },
        description: `An array of strings representing the new content for the specified line.
To replace the specified line, provide [new line content].
To append a new line after the specified line, provide [new line content, original line content].
To insert a new line before the specified line, provide [original line content, new line content].
To delete the specified line, provide an empty array.
`,
      },
    },
    required: ['filename', 'rowIndex', 'newLine'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      rows: {
        type: Type.INTEGER,
        description: 'The number of lines in the file after editing.',
      },
    },
    required: ['rows'],
  },
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { filename, rowIndex, newLine } = functionCall.args
  assert(typeof filename === 'string', `filename must be a string but got ${typeof filename}`)
  assert(typeof rowIndex === 'number', `rowIndex must be a number but got ${typeof rowIndex}`)
  assert(Array.isArray(newLine), `newLine must be an array but got ${typeof newLine}`)
  assert(
    newLine.every((line) => typeof line === 'string'),
    `newLine must be an array of strings but got ${JSON.stringify(newLine)}`,
  )

  const absolutePath = path.join(context.workspace, filename)
  const originalContent = await fs.readFile(absolutePath, 'utf-8')
  const lines = originalContent.split('\n')
  core.info(`🤖 Editing ${filename} at line ${rowIndex} (total ${lines.length} lines)`)
  assert(
    rowIndex >= 1 && rowIndex <= lines.length,
    `rowIndex must be between 1 and ${lines.length}, but got ${rowIndex}`,
  )

  core.info(`- ${lines[rowIndex - 1]}`)
  if (newLine.length > 0) {
    core.info(newLine.map((line) => `+ ${line}`).join('\n'))
    lines[rowIndex - 1] = newLine.join('\n')
  } else {
    lines.splice(rowIndex - 1, 1)
  }

  const newContent = lines.join('\n')
  await fs.writeFile(absolutePath, newContent, 'utf-8')
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      rows: lines.length,
    },
  }
}
