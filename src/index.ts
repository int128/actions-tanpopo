import * as core from '@actions/core'
import { getContext, getOctokit } from './github.ts'
import { run } from './run.ts'

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
  core.info(`Shutting down`)
  await core.summary.write()
  core.info(`Exiting`)
}
