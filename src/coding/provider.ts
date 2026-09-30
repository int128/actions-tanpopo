import * as core from '@actions/core'
import * as z from 'zod'

// https://developers.openai.com/api/reference/workload-identity-federation#response
const Token = z.object({
  access_token: z.string(),
  expires_at: z.number(),
})

type Token = z.infer<typeof Token>

export class TokenProvider {
  private cache?: Token

  async get(): Promise<string> {
    if (this.cache) {
      const expiresAt = new Date(this.cache.expires_at * 1000)
      if (new Date() < expiresAt) {
        return this.cache.access_token
      }
    }

    core.info(`Fetching an ID token from GitHub Actions`)
    const actionsToken = await core.getIDToken(process.env['OPENAI_AUDIENCE'])

    core.info(`Fetching an access token from OpenAI`)
    const tokenRequest = new Request('https://auth.openai.com/oauth/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        subject_token: actionsToken,
        identity_provider_id: process.env['OPENAI_IDENTITY_PROVIDER_ID'],
        service_account_id: process.env['OPENAI_SERVICE_ACCOUNT_ID'],
      }),
    })
    const tokenResponse = await fetch(tokenRequest)
    if (!tokenResponse.ok) {
      throw new Error(`OpenAI returned an error response: ${tokenResponse.status}: ${await tokenResponse.text()}`)
    }

    const token = Token.parse(await tokenResponse.json())
    core.info(`Got an access token from OpenAI (expires at ${new Date(token.expires_at * 1000).toISOString()})`)
    this.cache = token
    return token.access_token
  }
}
