import * as vscode from 'vscode';
import IOrganization from '../Entities/IOrganization';
import ISolution from '../Entities/ISolution';

export default class AuthorizationManager {
  private inputBoxOpen: boolean = false;
  private token: string = "";
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.token.set', async () => { return this.configureToken(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.token.get', async () => { return this.getToken(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.auth.logout', async () => { return this.logout(); }));
  }

  public waitForInputBoxClose() {
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

  public async configureToken() {
    this.token = "";

    await this.openTokenInput();
    await this.login();
  }

  public async login(): Promise<void> {
    const token = await this.getToken();
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-xrm.solution.get');
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-xrm.organization.get');
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