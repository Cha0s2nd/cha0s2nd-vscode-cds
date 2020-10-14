export interface IAuthToken {
  access_token: string,
  expires_in: number,
  expires_on: Date,
  not_before: Date,
  token_type: string,
  refresh_token: string,
  resource: string,
  scope: string[]
}