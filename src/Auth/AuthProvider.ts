import * as vscode from 'vscode';
import * as uuid from 'node-uuid';
import * as Constants from '../Core/Constants/Constants';
import * as msal from "@azure/msal-node";
import * as msalCommon from "@azure/msal-common";
import AuthUriHandler from './AuthUriHandler';
import AuthCachePlugin from './AuthCachePlugin';

export default class AuthProvider implements vscode.AuthenticationProvider {
  private authState: string = '';
  private client: msal.PublicClientApplication;
  private crypto: msal.CryptoProvider = new msal.CryptoProvider();
  private sessions: vscode.AuthenticationSession[] = [];
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
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.logout', async () => { return this.logout(); }));
  }

  public async login(): Promise<void> {
    await this.createSession([Constants.DISCOVERY_URL + '//user_impersonation']);
  }

  public async logout(): Promise<void> {
    this.sessionChangeEventEmitter.fire({ added: [], removed: this.sessions, changed: [] });
    this.sessions = [];
  }

  public async getSessions(scopes: string[]): Promise<readonly vscode.AuthenticationSession[]> {
    return scopes
      ? this.sessions.filter(session => session.scopes.find(scope => scopes.find(s => scope === s) !== undefined) !== undefined)
      : this.sessions;
  }

  public async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    const tokenResponse = await this.getToken(scopes);

    const session = {
      id: uuid.v4(),
      accessToken: tokenResponse?.accessToken || '',
      account: { label: tokenResponse?.account?.name || '', id: tokenResponse?.uniqueId || uuid.v4() },
      scopes: tokenResponse?.scopes || []
    };

    const sessionIndex = this.sessions.findIndex(s => s.id === session.id);
    if (sessionIndex > -1) {
      this.sessions.splice(sessionIndex, 1, session);
      this.sessionChangeEventEmitter.fire({ added: [], removed: [], changed: [session] });
    } else {
      this.sessions.push(session);
      this.sessionChangeEventEmitter.fire({ added: [session], removed: [], changed: [] });
    }

    return session;
  }

  public async removeSession(sessionId: string): Promise<void> {
    const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);

    if (sessionIndex >= 0) {
      const session = this.sessions[sessionIndex];
      this.sessions.splice(sessionIndex, 1);

      this.sessionChangeEventEmitter.fire({ added: [], removed: [session], changed: [] });
    }
  }

  private async getToken(scopes: string[]): Promise<msal.AuthenticationResult | null> {
    const authCode = await this.getAuthCode();

    const result = await this.client.acquireTokenByCode({
      code: authCode,
      redirectUri: Constants.REDIRECT_URL,
      scopes: scopes
    });

    return result;
  }

  private async getAuthCode(): Promise<string> {
    this.authState = vscode.env.uriScheme + '_' + this.crypto.createNewGuid();

    const authUrl = await this.client.getAuthCodeUrl({
      redirectUri: Constants.REDIRECT_URL,
      scopes: msalCommon.OIDC_DEFAULT_SCOPES,
      state: this.authState,
      prompt: msalCommon.PromptValue.SELECT_ACCOUNT
    });

    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    const timeoutPromise = new Promise<string>((resolve, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject('Login timed out.');
      }, 1000 * 60 * 5);
    });

    return await Promise.race([this.waitForCodeResponse(), timeoutPromise]);
  }

  private async waitForCodeResponse(): Promise<string> {
    let uriEventListener: vscode.Disposable;
    return new Promise((resolve: (code: string) => void, reject) => {
      uriEventListener = this.uriHandler.event(async (uri: vscode.Uri) => {
        try {
          const query = this.parseQuery(uri);
          if (query.code && query.state === decodeURIComponent(this.authState)) {
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
        } catch (err) {
          reject(err);
        }
      });
    }).then(result => {
      uriEventListener.dispose();
      return result;
    }).catch(err => {
      uriEventListener.dispose();
      throw err;
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