import * as vscode from 'vscode';
import * as uuid from 'node-uuid';
import * as Constants from '../Core/Constants/Constants';
import * as msal from "@azure/msal-node";
import * as msalCommon from "@azure/msal-common";
import AuthUriHandler from './AuthUriHandler';
import IAuthSession from '../Entities/IAuthSession';

export default class AuthProvider implements vscode.AuthenticationProvider {
  private client: msal.PublicClientApplication;
  private crypto: msal.CryptoProvider = new msal.CryptoProvider();
  private session?: IAuthSession;
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
      }
    });

    this.uriHandler = new AuthUriHandler();

    vscode.window.registerUriHandler(this.uriHandler);

    this.session = this.context.workspaceState.get<IAuthSession>('cha0s2nd-vscode-cds.auth.session');
    this.client.getTokenCache().deserialize(this.context.workspaceState.get<string>('cha0s2nd-vscode-cds.auth.tokenCache') || '');
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.logout', async () => { return this.logout(); }));
  }

  public async login(): Promise<void> {
    await this.createSession([Constants.DISCOVERY_URL + '//user_impersonation']);
  }

  public async logout(): Promise<void> {
    if (this.session) {
      this.sessionChangeEventEmitter.fire({ added: [], removed: [this.session.session], changed: [] });
      this.session = undefined;
    }
  }

  public async getSessions(scopes: string[]): Promise<readonly vscode.AuthenticationSession[]> {
    this.session = await this.retrieveSession(scopes, this.session);

    if (this.session) {
      return [this.session.session];
    }
    else {
      return [];
    }
  }

  public async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    this.session = await this.retrieveSession(scopes, this.session);

    if (!this.session) {
      this.session = await this.createNewSession(scopes);
    }

    return this.session.session;
  }

  public async removeSession(sessionId: string): Promise<void> {
    if (this.session) {
      this.sessionChangeEventEmitter.fire({ added: [], removed: [this.session.session], changed: [] });
      this.session = undefined;
    }
  }

  private async createNewSession(scopes: string[]): Promise<IAuthSession> {
    let tokenResponse = null;

    const authCode = await this.getAuthCode();

    tokenResponse = await this.client.acquireTokenByCode({
      code: authCode,
      redirectUri: Constants.REDIRECT_URL,
      scopes: scopes,
    });

    const newSession = {
      result: tokenResponse,
      session: {
        id: tokenResponse?.uniqueId || uuid.v4(),
        accessToken: tokenResponse?.accessToken || '',
        account: { label: tokenResponse?.account?.name || '', id: tokenResponse?.uniqueId || uuid.v4() },
        scopes: tokenResponse?.scopes || []
      }
    };

    this.sessionChangeEventEmitter.fire({ added: [newSession.session], removed: [], changed: [] });

    this.session = newSession;
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.session', this.session);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.tokenCache', this.client.getTokenCache().serialize());

    return newSession;
  }

  private async retrieveSession(scopes: string[], session?: IAuthSession): Promise<IAuthSession | undefined> {
    let tokenResponse = null;

    if (session && session.result && session.result.account) {
      try {
        tokenResponse = await this.client.acquireTokenSilent({
          account: session.result.account,
          scopes: scopes
        });
      }
      catch (error) {
        return;
      }
    }
    else {
      return;
    }

    const newSession = {
      result: tokenResponse,
      session: {
        id: tokenResponse?.uniqueId || uuid.v4(),
        accessToken: tokenResponse?.accessToken || '',
        account: { label: tokenResponse?.account?.name || '', id: tokenResponse?.uniqueId || uuid.v4() },
        scopes: tokenResponse?.scopes || []
      }
    };

    this.sessionChangeEventEmitter.fire({ added: [], removed: [], changed: [newSession.session] });

    this.session = newSession;
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.session', this.session);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.tokenCache', this.client.getTokenCache().serialize());

    return newSession;
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
      const cancellationTokenSource = new vscode.CancellationTokenSource();

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
        cancellationTokenSource.cancel();
        cancellationTokenSource.dispose();
      });

      vscode.window.showInputBox({
        ignoreFocusOut: true,
        password: true,
        placeHolder: 'Authorization Code',
        prompt: 'Follow the prompts and wait for the login to complete from the browser or paste in the Authorization Code given on the site.',
      }, cancellationTokenSource.token).then((token) => {
        if (token) {
          resolve(token);
        }
        cancellationTokenSource.dispose();
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