import * as vscode from 'vscode';
import * as uuid from 'node-uuid';
import * as Constants from '../Core/Constants/Constants';
import * as rp from 'request-promise';
import { parseStringPromise } from 'xml2js';
import IAuthSession from '../Entities/IAuthSession';

export default class AuthProvider implements vscode.AuthenticationProvider {
  private sessions: IAuthSession[];
  private sessionChangeEventEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  private context: vscode.ExtensionContext;

  public onDidChangeSessions: vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.onDidChangeSessions = this.sessionChangeEventEmitter.event;

    this.sessions = this.context.workspaceState.get<IAuthSession[]>('cha0s2nd-vscode-cds.auth.sessions') || [];
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.logout', async () => { return this.logout(); }));
  }

  public async login(): Promise<void> {
    await this.createSession(['openid']);
  }

  public async logout(): Promise<void> {
    this.sessionChangeEventEmitter.fire({ added: [], removed: this.sessions.map(s => s.session), changed: [] });
    this.sessions = [];
  }

  public async getSessions(scopes: string[]): Promise<readonly vscode.AuthenticationSession[]> {
    const sessions = scopes
      ? this.sessions.filter(session => session.session.scopes.find(scope => scopes.find(s => scope === s) !== undefined) !== undefined)
      : this.sessions;

    const newSessions = [];

    for (let session of sessions) {
      newSessions.push(await (await this.createOrUpdateSession(scopes, session)).session);
    }

    return newSessions;
  }

  public async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    const sessions = scopes
      ? this.sessions.filter(session => session.session.scopes.find(scope => scopes.find(s => scope === s) !== undefined) !== undefined)
      : this.sessions;

    return await (await this.createOrUpdateSession(scopes, sessions.find(() => true))).session;
  }

  public async removeSession(sessionId: string): Promise<void> {
    const sessionIndex = this.sessions.findIndex(s => s.session.id === sessionId);

    if (sessionIndex >= 0) {
      const session = this.sessions[sessionIndex];
      this.sessions.splice(sessionIndex, 1);

      this.sessionChangeEventEmitter.fire({ added: [], removed: [session.session], changed: [] });
    }
  }

  private async createOrUpdateSession(scopes: string[], session?: IAuthSession): Promise<IAuthSession> {
    let newSession: IAuthSession | null | undefined = null;

    if (session && session.result) {
      try {
        const loginRedirect = await rp(session.result, { method: 'GET', jar: true, followRedirect: false, resolveWithFullResponse: true });

        newSession = session;
      }
      catch (err: any) {
        newSession = await this.retrieveCookies(scopes, session.result, session.session.account?.id);
      }
    }
    else {
      newSession = await this.retrieveCookies(scopes);
    }

    if (!newSession) {
      throw new Error('Failed to create session');
    }

    const sessionIndex = this.sessions.findIndex(s => s.session.id === newSession?.session.id);
    if (sessionIndex > -1) {
      this.sessions.splice(sessionIndex, 1, newSession);
      this.sessionChangeEventEmitter.fire({ added: [], removed: [], changed: [newSession.session] });
    } else {
      this.sessions.push(newSession);
      this.sessionChangeEventEmitter.fire({ added: [newSession.session], removed: [], changed: [] });
    }

    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.sessions', this.sessions);

    return newSession;
  }

  private async retrieveCookies(scopes: string[], url?: string, username?: string): Promise<IAuthSession | undefined> {
    if (!url) {
      url = await this.getCRMUrl();
    }

    if (!username) {
      username = await this.getUsername();
    }

    const password = await this.getPassword();

    if (url) {
      try {
        const loginRedirect = await rp(url, { method: 'GET', jar: true, followRedirect: false, resolveWithFullResponse: true });
        console.log(loginRedirect);
      }
      catch (err: any) {
        if (err.response.statusCode === 302) {
          try {
            const loginResponse = await rp(err.response.headers.location, {
              method: 'POST',
              jar: true,
              headers: {
                'Accept': '*/*',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Connection': 'keep-alive'
              },
              form: {
                'UserName': 'xlink\\frederikr',
                'Password': "<*#'wS[K$u[:%7W7",
                'AuthMethod': 'FormsAuthentication'
              },
              followAllRedirects: true,
              resolveWithFullResponse: true,
            });
            console.log(loginResponse);

            const loginPayload = await parseStringPromise(loginResponse.body);

            const cookies = await rp(url, {
              method: 'POST',
              jar: true,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              form: {
                'wa': loginPayload.html.body[0].form[0].input.find((input: any) => input.$.name === 'wa').$.value,
                'wresult': loginPayload.html.body[0].form[0].input.find((input: any) => input.$.name === 'wresult').$.value,
                'wctx': loginPayload.html.body[0].form[0].input.find((input: any) => input.$.name === 'wctx').$.value
              },
              followAllRedirects: true,
              resolveWithFullResponse: true
            });
          }
          catch (err: any) {
            console.log(err);
          }
        }
      }

      return {
        result: url,
        session: {
          id: url || uuid.v4(),
          accessToken: '',
          account: { label: username || '', id: username || uuid.v4() },
          scopes: scopes || []
        }
      };
    }
  }

  private async getUsername(): Promise<string | undefined> {
    const inputPromise = vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'Username'
    });

    const timeoutPromise = new Promise<string>((resolve, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject('Login timed out.');
      }, 1000 * 30);
    });

    return await Promise.race([inputPromise, timeoutPromise]);
  }

  private async getPassword(): Promise<string | undefined> {
    const inputPromise = vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'Password',
      password: true
    });

    const timeoutPromise = new Promise<string>((resolve, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject('Login timed out.');
      }, 1000 * 30);
    });

    return await Promise.race([inputPromise, timeoutPromise]);
  }

  private async getCRMUrl(): Promise<string | undefined> {
    const inputPromise = vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'CRM Server Url',
      prompt: 'Please enter the CRM url and port'
    });

    const timeoutPromise = new Promise<string>((resolve, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject('Login timed out.');
      }, 1000 * 30);
    });

    return await Promise.race([inputPromise, timeoutPromise]);
  }

  private parseQuery(uri: vscode.Uri) {
    return uri.query.split('&').reduce((prev: any, current) => {
      const queryString = current.split('=');
      prev[queryString[0]] = queryString[1];
      return prev;
    }, {});
  }
}