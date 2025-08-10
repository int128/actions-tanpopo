import * as exec from '@actions/exec'

export const applyTask = async (taskDir: string, workspace: string) => {
  await exec.exec(
    'npx',
    [
      'https://github.com/google-gemini/gemini-cli',
      '--yolo',
      '--prompt',
      `
You are an agent for software development.
Follow the task instruction in ${taskDir}/README.md.
The current working directory contains the codebase of the task.
Your changes will be committed to the repository after you finish the task.
`,
    ],
    {
      cwd: workspace,
    },
  )
}
