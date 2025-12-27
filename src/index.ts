import * as core from '@actions/core'
import { getContext, getOctokit } from './github.js'
import { run } from './run.js'

try {
  const octokit = getOctokit()
  const context = await getContext()
  const inputs = {
    tasks: core.getMultilineInput('tasks'),
  }
  await run(inputs, octokit, context)
} catch (e) {
  core.setFailed(e instanceof Error ? e : String(e))
  console.error(e)
} finally {
  await core.summary.write()
}
