import * as vscode from 'vscode';
import * as uuid from 'node-uuid';
import * as Constants from '../Core/Constants/Constants';
import * as msal from "@azure/msal-node";
import * as msalCommon from "@azure/msal-common";
import AuthUriHandler from './AuthUriHandler';
import AuthCachePlugin from './AuthCachePlugin';
import IAuthSession from '../Entities/IAuthSession';

export default class AuthProvider implements vscode.AuthenticationProvider {
  private client: msal.PublicClientApplication;
  private crypto: msal.CryptoProvider = new msal.CryptoProvider();
  private sessions: IAuthSession[];
  private sessionChangeEventEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  private uriHandler: AuthUriHandler;
  private context: vscode.ExtensionContext;

  public onDidChangeSessions: vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.onDidChangeSessions = this.sessionChangeEventEmitter.event;

    this.client = new msal.PublicClientApplication({
      auth: {
        clientId: Constants.CLIENT_ID,
        clientSecret: Constants.CLIENT_SECRET,
        authority: msalCommon.Constants.DEFAULT_AUTHORITY,
        knownAuthorities: [msalCommon.Constants.DEFAULT_AUTHORITY],
      },
      cache: {
        cachePlugin: new AuthCachePlugin(context)
      }
    });

    this.uriHandler = new AuthUriHandler();

    vscode.window.registerUriHandler(this.uriHandler);

    this.sessions = this.context.workspaceState.get<IAuthSession[]>('cha0s2nd-vscode-cds.auth.sessions') || [];
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.logout', async () => { return this.logout(); }));
  }

  public async login(): Promise<void> {
    await this.createSession([Constants.DISCOVERY_URL + '//user_impersonation']);
  }

  public async logout(): Promise<void> {
    this.sessionChangeEventEmitter.fire({ added: [], removed: this.sessions.map(s => s.session), changed: [] });
    this.sessions = [];
  }

  public async getSessions(scopes: string[]): Promise<readonly vscode.AuthenticationSession[]> {
    return scopes
      ? this.sessions.filter(session => session.session.scopes.find(scope => scopes.find(s => scope === s) !== undefined) !== undefined).map(session => session.session)
      : this.sessions.map(session => session.session);
  }

  public async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    const tokenResponse = await this.getToken(scopes);

    const session = {
      result: tokenResponse,
      session: {
        id: tokenResponse?.uniqueId || uuid.v4(),
        accessToken: tokenResponse?.accessToken || '',
        account: { label: tokenResponse?.account?.name || '', id: tokenResponse?.uniqueId || uuid.v4() },
        scopes: tokenResponse?.scopes || []
      }
    };

    const sessionIndex = this.sessions.findIndex(s => s.session.id === session.session.id);
    if (sessionIndex > -1) {
      this.sessions.splice(sessionIndex, 1, session);
      this.sessionChangeEventEmitter.fire({ added: [], removed: [], changed: [session.session] });
    } else {
      this.sessions.push(session);
      this.sessionChangeEventEmitter.fire({ added: [session.session], removed: [], changed: [] });
    }

    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.sessions', this.sessions);

    return session.session;
  }

  public async removeSession(sessionId: string): Promise<void> {
    const sessionIndex = this.sessions.findIndex(s => s.session.id === sessionId);

    if (sessionIndex >= 0) {
      const session = this.sessions[sessionIndex];
      this.sessions.splice(sessionIndex, 1);

      this.sessionChangeEventEmitter.fire({ added: [], removed: [session.session], changed: [] });
    }
  }

  private async getToken(scopes: string[]): Promise<msal.AuthenticationResult | null> {
    const sessions = scopes
      ? this.sessions.filter(session => session.session.scopes.find(scope => scopes.find(s => scope === s) !== undefined) !== undefined)
      : this.sessions;

    if (sessions.length > 0 && sessions[0].result && sessions[0].result.account) {
      try {
        return await this.client.acquireTokenSilent({
          account: sessions[0].result.account,
          scopes: scopes
        });
      }
      catch {
        const authCode = await this.getAuthCode();

        return await this.client.acquireTokenByCode({
          code: authCode,
          redirectUri: Constants.REDIRECT_URL,
          scopes: scopes
        });
      }
    }
    else {
      const authCode = await this.getAuthCode();

      return await this.client.acquireTokenByCode({
        code: authCode,
        redirectUri: Constants.REDIRECT_URL,
        scopes: scopes
      });
    }
  }

  private async getAuthCode(): Promise<string> {
    const authState = vscode.env.uriScheme + '_' + this.crypto.createNewGuid();

    const authUrl = await this.client.getAuthCodeUrl({
      redirectUri: Constants.REDIRECT_URL,
      scopes: msalCommon.OIDC_DEFAULT_SCOPES,
      state: authState,
      prompt: msalCommon.PromptValue.SELECT_ACCOUNT
    });

    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    const timeoutPromise = new Promise<string>((resolve, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject('Login timed out.');
      }, 1000 * 60 * 5);
    });

    return await Promise.race([this.waitForCodeResponse(authState), timeoutPromise]);
  }

  private async waitForCodeResponse(authState: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.uriHandler.event((uri: vscode.Uri) => {
        const query = this.parseQuery(uri);
        if (query.code && query.state === decodeURIComponent(authState)) {
          resolve(query.code);
        }
        else if (query.error) {
          while (query.error_description.indexOf('+') >= 0) {
            query.error_description = query.error_description.replace("+", " ");
          }
          reject(`Login failed: ${query.error_description} - ${query.error}`);
        }
        else {
          reject(`Login failed: The response was not from the request send by this application - invalid_state`);
        }
      });
    });
  }

  private parseQuery(uri: vscode.Uri) {
    return uri.query.split('&').reduce((prev: any, current) => {
      const queryString = current.split('=');
      prev[queryString[0]] = queryString[1];
      return prev;
    }, {});
  }
}