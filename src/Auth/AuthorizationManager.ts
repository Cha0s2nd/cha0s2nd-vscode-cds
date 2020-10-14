import * as vscode from 'vscode';
import * as Constants from '../Core/Constants/Constants';
import AuthUriHandler from './AuthUriHandler';
import { IAuthToken } from '../Entities';
import * as rp from 'request-promise';
import IOrganization from '../Entities/IOrganization';
import ISolution from '../Entities/ISolution';

export default class AuthorizationManager {
  private uriHandler: AuthUriHandler;
  private token: IAuthToken | null | undefined;
  private discoveryToken: IAuthToken | null | undefined;
  private tokenExpiryDate: Date;
  private discoveryTokenExpiryDate: Date;
  private context: vscode.ExtensionContext;

  private static authCode: string;
  private authState: string = '';
  private inputBoxOpen: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.token = context.workspaceState.get<IAuthToken>('cha0s2nd-vscode-cds.auth.token');
    this.discoveryToken = context.workspaceState.get<IAuthToken>('cha0s2nd-vscode-cds.auth.discoveryToken');
    this.discoveryTokenExpiryDate = new Date(context.workspaceState.get<string>('cha0s2nd-vscode-cds.auth.discoveryTokenExpiryDate') || new Date(0));
    this.tokenExpiryDate = new Date(context.workspaceState.get<string>('cha0s2nd-vscode-cds.auth.tokenExpiryDate') || new Date(0));
    this.uriHandler = new AuthUriHandler();

    vscode.window.registerUriHandler(this.uriHandler);
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.login', async () => { return this.login(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.discoveryToken.get', async () => { return (await this.getDiscoveryToken()).access_token; }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.organizationToken.get', async (organization: IOrganization) => { return (await this.getOrganizationToken(organization)).access_token; }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.logout', async () => { return this.logout(); }));
  }

  private parseQuery(uri: vscode.Uri) {
    return uri.query.split('&').reduce((prev: any, current) => {
      const queryString = current.split('=');
      prev[queryString[0]] = queryString[1];
      return prev;
    }, {});
  }

  private hasTokenExpired(token: IAuthToken): boolean {
    return new Date().getTime() > new Date().setTime(this.tokenExpiryDate.getTime() + token.expires_in * 1000);
  }

  private isTokenAboutToExpire(token: IAuthToken): boolean {
    return new Date().getTime() > new Date().setTime(this.tokenExpiryDate.getTime() - (5 * 60 * 1000) + (token.expires_in * 1000));
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

  private async getAuthCode() {
    return new Promise<string>(async (resolve: (code: string) => void, reject) => {
      try {
        if (AuthorizationManager.authCode) {
          resolve(AuthorizationManager.authCode);
        }

        this.authState = Math.random().toString(36).slice(2);

        await vscode.env.openExternal(vscode.Uri.parse(`${Constants.AUTH_URL}?response_type=code&client_id=${Constants.CLIENT_ID}&response_mode=query&redirect_uri=${encodeURIComponent(Constants.REDIRECT_URL)}&scope=${encodeURIComponent(Constants.SCOPES.join(' '))}&prompt=select_account&state=${this.authState}`));

        const timeoutPromise = new Promise<string>((_: () => void, reject) => {
          const wait = setTimeout(() => {
            clearTimeout(wait);
            reject('Login timed out.');
          }, 1000 * 60 * 5);
        });

        const code = await Promise.race([this.waitForCodeResponse(), timeoutPromise]);

        resolve(code);
      }
      catch (ex) {
        reject(ex);
      }
    });
  }

  public async getDiscoveryToken(): Promise<IAuthToken> {
    return new Promise<IAuthToken>(async (resolve, reject) => {
      try {
        // if (this.discoveryToken && this.isTokenAboutToExpire(this.discoveryToken) && !this.hasTokenExpired(this.discoveryToken)) {
        //   // TODO: add refresh token api call
        //   this.tokenExpiryDate = new Date();
        //   this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', this.discoveryToken);
        // }
        // else if
        if (!this.discoveryToken || this.hasTokenExpired(this.discoveryToken)) {
          const code = await this.getAuthCode();

          const params: string[] = [];
          params.push('resource=' + encodeURIComponent(Constants.DISCOVERY_URL));
          params.push('grant_type=authorization_code');
          params.push('scope=' + (Constants.SCOPES.join(' ')));
          params.push('redirect_uri=' + encodeURIComponent(Constants.REDIRECT_URL));
          params.push('client_id=' + encodeURIComponent(Constants.CLIENT_ID));
          params.push('client_secret=' + encodeURIComponent(Constants.CLIENT_SECRET));
          params.push('code=' + encodeURIComponent(code));

          this.discoveryToken = <IAuthToken>await rp.post(Constants.TOKEN_URL, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.join('&')
          }).then(response => JSON.parse(response));

          this.discoveryTokenExpiryDate = new Date();
          this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryToken', this.discoveryToken);
          this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryTokenExpiryDate', this.discoveryTokenExpiryDate);
        }

        resolve(this.discoveryToken);
      }
      catch (ex) {
        reject(ex);
      }
    });
  }

  public async getOrganizationToken(organization: IOrganization): Promise<IAuthToken> {
    return new Promise<IAuthToken>(async (resolve, reject) => {
      try {
        // if (this.token && this.isTokenAboutToExpire(this.token) && !this.hasTokenExpired(this.token)) {
        //   // TODO: add refresh token api call
        //   this.tokenExpiryDate = new Date();
        //   this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', this.token);
        //   this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.lastTokenDate', this.tokenExpiryDate);
        // }
        // else if
        if (!this.token || this.hasTokenExpired(this.token)) {
          const code = await this.getAuthCode();

          const params: string[] = [];
          params.push('resource=' + encodeURIComponent(organization.Url));
          params.push('grant_type=authorization_code');
          params.push('scope=' + encodeURIComponent(Constants.SCOPES.join(' ')));
          params.push('redirect_uri=' + encodeURIComponent(Constants.REDIRECT_URL));
          params.push('client_id=' + encodeURIComponent(Constants.CLIENT_ID));
          params.push('client_secret=' + encodeURIComponent(Constants.CLIENT_SECRET));
          params.push('code=' + encodeURIComponent(code));

          this.token = <IAuthToken>await rp.post(Constants.TOKEN_URL, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.join('&')
          }).then(response => JSON.parse(response));

          this.tokenExpiryDate = new Date();
          this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', this.token);
          this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.tokenExpiryDate', this.tokenExpiryDate);
        }

        resolve(this.token);
      }
      catch (ex) {
        reject(ex);
      }
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

  public async openTokenInput(): Promise<IAuthToken | null> {
    await this.waitForInputBoxClose();
    this.inputBoxOpen = true;
    const token = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'Token',
      password: true
    });
    this.inputBoxOpen = false;

    if (token) {
      return {
        access_token: token,
        expires_in: 999999,
        expires_on: new Date(9999, 1, 1),
        not_before: new Date(1, 1, 1),
        token_type: "Bearer",
        refresh_token: "",
        resource: "",
        scope: []
      };
    }

    return null;
  }

  public async configureToken() {
    this.token = await this.openTokenInput();
    await this.login();
  }

  public async login(): Promise<void> {
    try {
      const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
      const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
      if (org && solution) {
        vscode.window.showInformationMessage('Logged in to "' + org.FriendlyName + '" using the "' + solution.FriendlyName + '" solution');
      }
    }
    catch (error) {
      console.error("Login failed: " + error);
    }
  }

  public async logout(): Promise<void> {
    this.discoveryToken = null;
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryToken', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryTokenExpiryDate', null);
    this.token = null;
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.tokenExpiryDate', null);

    this.context.workspaceState.update('cha0s2nd-vscode-cds.organization', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.solution', null);

    AuthorizationManager.authCode = '';

    vscode.window.showInformationMessage("Successfully logged out of cds");
  }
}