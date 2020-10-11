import { AuthenticationContext } from 'adal-node';
import * as vscode from 'vscode';
import IOrganization from '../Entities/IOrganization';
import ISolution from '../Entities/ISolution';
import AuthUriHandler from './AuthUriHandler';

export default class AuthorizationManager {
  private uriHandler: AuthUriHandler;
  private inputBoxOpen: boolean = false;
  private username: string = "";
  private password: string = "";
  private token: string = "";
  private discoveryToken: string = "";
  private organizationToken: string = "";
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.uriHandler = new AuthUriHandler();

    vscode.window.registerUriHandler(this.uriHandler);
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.token.set', async () => { return this.configureToken(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.token.get', async () => { return this.getToken(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.logout', async () => { return this.logout(); }));
  }

  private parseQuery(uri: vscode.Uri) {
    return uri.query.split('&').reduce((prev: any, current) => {
      const queryString = current.split('=');
      prev[queryString[0]] = queryString[1];
      return prev;
    }, {});
  }

  private async waitForCodeResponse(): Promise<string> {
    let uriEventListener: vscode.Disposable;
    return new Promise((resolve: (token: string) => void, reject) => {
      uriEventListener = this.uriHandler.event(async (uri: vscode.Uri) => {
        try {
          const query = this.parseQuery(uri);
          const token = await this.getOrganizationToken(query.code);
          resolve(token);
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

  public waitForInputBoxClose(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let timeOut = 0;
      const wait = () => {
        if (this.inputBoxOpen || timeOut < 30) {
          timeOut++;
          setTimeout(wait, 1000);
        }
        else if (timeOut >= 30) {
          reject();
        } else {
          resolve();
        }
      };
      wait();
    });
  }

  public async openTokenInput(): Promise<string> {
    await this.waitForInputBoxClose();
    this.inputBoxOpen = true;
    const token = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'Token',
      password: true
    });
    this.inputBoxOpen = false;

    if (token) {
      this.token = token;
    }

    return this.token;
  }

  public async openUsernameInput(): Promise<string> {
    await this.waitForInputBoxClose();
    this.inputBoxOpen = true;
    const username = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'Username',
      value: this.username,
    });
    this.inputBoxOpen = false;

    if (username) {
      this.username = username;
    }

    return this.username;
  }

  public async openPasswordInput(): Promise<string> {
    await this.waitForInputBoxClose();
    this.inputBoxOpen = true;
    const password = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'Password',
      password: true
    });
    this.inputBoxOpen = false;

    if (password) {
      this.password = password;
    }

    return this.password;
  }

  public async getToken(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (this.token) {
        resolve(this.token);
      }
      else {
        try {
          const session = await vscode.authentication.getSession("microsoft", ["openid"], { createIfNone: true });
          this.token = session.accessToken;
          resolve(this.token);
        }
        catch (ex) {
          reject(ex)
        }
      }
    });
  }

  public async getDiscoveryToken(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (this.discoveryToken) {
        resolve(this.discoveryToken);
      }
      else {
        const authenticationContext = new AuthenticationContext(vscode.workspace.getConfiguration('vs-xrm-tools.authorization', null).get('tokenUrl') || '');
        authenticationContext.acquireTokenWithUsernamePassword(
          vscode.workspace.getConfiguration('vs-xrm-tools.organization', null).get('discoveryUrl') || '',
          await this.openUsernameInput(),
          await this.openPasswordInput(),
          '2ad88395-b77d-4561-9441-d0e40824f9bc', // default client id
          (error: Error, tokenResponse: any) => {
            if (error) {
              vscode.window.showErrorMessage(error.message);
              reject(error);
            } else {
              this.discoveryToken = tokenResponse.accessToken;
              resolve(tokenResponse.accessToken);
            }
          });
      }
    });
  }

  public async getOrganizationToken(organization: IOrganization): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (this.token) {
        resolve(this.token);
      }
      else {
        const authenticationContext = new AuthenticationContext(vscode.workspace.getConfiguration('vs-xrm-tools.authorization', null).get('tokenUrl') || '');
        authenticationContext.acquireTokenWithUsernamePassword(
          organization.Url,
          await this.openUsernameInput(),
          await this.openPasswordInput(),
          '2ad88395-b77d-4561-9441-d0e40824f9bc', // default client id
          (error: Error, tokenResponse: any) => {
            if (error) {
              vscode.window.showErrorMessage(error.message);
              reject(error);
            } else {
              this.token = tokenResponse.accessToken;
              resolve(tokenResponse.accessToken);
            }
          });
      }
    });
  }

  public async configureToken() {
    this.token = "";

    await this.openTokenInput();
    await this.login();
  }

  public async login(): Promise<void> {
    vscode.env.openExternal(vscode.Uri.parse(`https://login.microsoftonline.com/oauth2/v2.0/authorize?response_type=code&client_id=2ad88395-b77d-4561-9441-d0e40824f9bc&response_mode=query&redirect_uri=${encodeURIComponent('vscode://cha0s2nd-vscode-xrm')}&scope=openid&prompt=select_account`));

    const timeoutPromise = new Promise<string>((_: () => void, reject) => {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        reject('Login timed out.');
      }, 1000 * 60 * 5);
    });

    const code = await Promise.race([this.waitForCodeResponse(), timeoutPromise]);

    const token = await this.getToken();
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-xrm.organization.get');
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-xrm.solution.get');
    if (token && org && solution) {
      vscode.window.showInformationMessage('Logged in to "' + org.FriendlyName + '" using the "' + solution.FriendlyName + '" solution');
    }
  }

  public async logout(): Promise<void> {
    this.context.workspaceState.update('cha0s2nd-vscode-xrm.organization', null);
    this.context.workspaceState.update('cha0s2nd-vscode-xrm.auth.token', null);
    this.context.workspaceState.update('cha0s2nd-vscode-xrm.auth.refreshToken', null);
  }
}