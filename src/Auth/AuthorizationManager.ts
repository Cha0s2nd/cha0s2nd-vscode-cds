import { AuthenticationContext, ErrorResponse, TokenResponse } from 'adal-node';
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
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.uriHandler = new AuthUriHandler();

    vscode.window.registerUriHandler(this.uriHandler);
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.token.set', async () => { return this.configureToken(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.discoveryToken.get', async (codeResponse) => { return this.getDiscoveryToken(codeResponse); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.organizationToken.get', async (organization: IOrganization) => { return this.getOrganizationToken(organization); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.logout', async () => { return this.logout(); }));
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
          const token = await this.getDiscoveryToken(query.code);
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

  public async getDiscoveryToken(codeResponse: any | undefined): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (this.discoveryToken) {
        resolve(this.discoveryToken);
      }
      else {
        const authenticationContext = new AuthenticationContext(vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.authorization', null).get('tokenUrl') || '');
        authenticationContext.acquireTokenWithAuthorizationCode(
          codeResponse.code,
          codeResponse.redirectUri,
          vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.organization', null).get('discoveryUrl') || '',
          vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.auth', null).get('appId') || '',
          'I7Oq-ro644~Kj~BtAk5~XW6.7TN~ZH20b_',
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
        const authenticationContext = new AuthenticationContext(vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.auth', null).get('tokenUrl') || '');
        authenticationContext.acquireTokenWithUsernamePassword(
          organization.Url,
          await this.openUsernameInput(),
          await this.openPasswordInput(),
          vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.auth', null).get('appId') || '',
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
    vscode.env.openExternal(vscode.Uri.parse(`${vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.auth', null).get('authUrl') || ''}?response_type=code&client_id=4651f5dc-bf6a-4da7-96f5-505f98e24622&response_mode=query&redirect_uri=${encodeURIComponent(`${vscode.env.uriScheme}://Cha0s2nd.cha0s2nd-vscode-cds`)}&scope=openid&prompt=select_account`));

    try {
      const token = await this.waitForCodeResponse();

      const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
      const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
      if (token && org && solution) {
        vscode.window.showInformationMessage('Logged in to "' + org.FriendlyName + '" using the "' + solution.FriendlyName + '" solution');
      }
    }
    catch (error) {
      console.error("Login failed: " + error);
    }
  }

  public async logout(): Promise<void> {
    this.context.workspaceState.update('cha0s2nd-vscode-cds.organization', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.refreshToken', null);
  }
}