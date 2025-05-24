import assert from 'assert'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

const description = `Apply a patch to a file.
This runs \`patch --strip 1\` command in the workspace.

Here is an example of a patch:

\`\`\`
--- a/README.md
+++ b/README.md
@@ -1,5 +1,5 @@
 # My Project
 
-This is a sample project.
+This is a sample project with a patch.
 
 ## Getting Started
\`\`\`
`

export const declaration: FunctionDeclaration = {
  description,
  name: 'applyPatch',
  parameters: {
    type: Type.OBJECT,
    properties: {
      patch: {
        type: Type.STRING,
        description: 'The patch to apply',
      },
    },
    required: ['patch'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      error: {
        type: Type.STRING,
        description: 'The error message if the patch failed. Empty if the patch succeeded',
      },
    },
    required: ['error'],
  },
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { patch } = functionCall.args
  assert(typeof patch === 'string', `patch must be a string but got ${typeof patch}`)
  core.startGroup(`Patch`)
  core.info(patch)
  core.endGroup()
  const { stderr, exitCode } = await exec.getExecOutput('patch', ['--strip', '1'], {
    input: Buffer.from(patch),
    cwd: context.workspace,
  })
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      error: exitCode === 0 ? '' : stderr,
    },
  }
}
