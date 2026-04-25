export const sanitizeEnv = (processEnv: NodeJS.ProcessEnv) => {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(processEnv)) {
    if (value && !key.startsWith('GITHUB_') && !key.startsWith('INPUT_')) {
      env[key] = value
    }
  }
  return env
}
