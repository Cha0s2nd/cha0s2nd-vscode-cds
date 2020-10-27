import * as vscode from 'vscode';
import * as uuid from 'node-uuid';
import * as Constants from '../Core/Constants/Constants';
import * as rp from 'request-promise';
import IOrganization from '../Entities/IOrganization';
import ISolution from '../Entities/ISolution';
import AuthUriHandler from './AuthUriHandler';
import { IAuthToken } from '../Entities';

export default class AuthorizationManager {
  private uriHandler: AuthUriHandler;
  private token: IAuthToken | null | undefined;
  private discoveryToken: IAuthToken | null | undefined;
  private tokenExpiryDate: Date;
  private discoveryTokenExpiryDate: Date;
  private context: vscode.ExtensionContext;

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
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.discoveryToken.get', async () => { return (await this.getDiscoveryToken()); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.organizationToken.get', async (organization: IOrganization) => { return (await this.getOrganizationToken(organization)); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.discoveryToken.set', async () => { await this.configureDiscoveryToken(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.auth.organizationToken.set', async () => { await this.configureOrganizationToken(); }));
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
        this.authState = vscode.env.uriScheme + '_' + uuid.v4();

        await vscode.env.openExternal(vscode.Uri.parse(`${Constants.AUTH_URL}?response_type=code&client_id=${Constants.CLIENT_ID}&response_mode=query&redirect_uri=${encodeURIComponent(Constants.REDIRECT_URL)}&scope=${encodeURIComponent(Constants.SCOPES.join(' '))}&prompt=select_account&state=${this.authState}`));

        const timeoutPromise = new Promise<string>((_: () => void, reject) => {
          const wait = setTimeout(() => {
            clearTimeout(wait);
            reject('Login timed out.');
          }, 1000 * 60 * 5);
        });

        resolve(await Promise.race([this.waitForCodeResponse(), timeoutPromise]));
      }
      catch (ex) {
        reject(ex);
      }
    });
  }

  public async getDiscoveryToken(): Promise<IAuthToken> {
    return new Promise<IAuthToken>(async (resolve, reject) => {
      try {
        if (this.discoveryToken && this.isTokenAboutToExpire(this.discoveryToken) && !this.hasTokenExpired(this.discoveryToken)) {
          const params: string[] = [];
          params.push('resource=' + encodeURIComponent(Constants.DISCOVERY_URL));
          params.push('grant_type=refresh_token');
          params.push('scope=' + encodeURIComponent(Constants.SCOPES.join(' ')));
          params.push('redirect_uri=' + encodeURIComponent(Constants.REDIRECT_URL));
          params.push('client_id=' + encodeURIComponent(Constants.CLIENT_ID));
          params.push('client_secret=' + encodeURIComponent(Constants.CLIENT_SECRET));
          params.push('refresh_token=' + encodeURIComponent(this.discoveryToken?.refresh_token));

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
        else if (!this.discoveryToken || this.hasTokenExpired(this.discoveryToken)) {
          if (await vscode.window.showInformationMessage("You will now be redirected to a browser to log into the Discovery service.", {
            modal: true
          }, "Continue") !== "Continue") {
            throw new Error("User canceled login");
          }

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
        this.discoveryToken = null;
        this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryToken', null);
        reject(ex);
      }
    });
  }

  public async getOrganizationToken(organization: IOrganization): Promise<IAuthToken> {
    return new Promise<IAuthToken>(async (resolve, reject) => {
      try {
        if (this.token && this.isTokenAboutToExpire(this.token) && !this.hasTokenExpired(this.token)) {
          const params: string[] = [];
          params.push('resource=' + encodeURIComponent(organization.Url));
          params.push('grant_type=refresh_token');
          params.push('scope=' + encodeURIComponent(Constants.SCOPES.join(' ')));
          params.push('redirect_uri=' + encodeURIComponent(Constants.REDIRECT_URL));
          params.push('client_id=' + encodeURIComponent(Constants.CLIENT_ID));
          params.push('client_secret=' + encodeURIComponent(Constants.CLIENT_SECRET));
          params.push('refresh_token=' + encodeURIComponent(this.token.refresh_token));

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
        else if (!this.token || this.hasTokenExpired(this.token)) {
          if (await vscode.window.showInformationMessage("You will now be redirected to a browser to log into the Organization.", {
            modal: true
          }, "Continue") !== "Continue") {
            throw new Error("User canceled login");
          }

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
        this.token = null;
        this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', null);
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

  public async configureDiscoveryToken() {
    const token = await this.openTokenInput();

    if (token) {
      this.discoveryToken = token;
      this.tokenExpiryDate = new Date();
      this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryToken', this.token);
      this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryTokenExpiryDate', this.tokenExpiryDate);

      await this.login();
    }
  }

  public async configureOrganizationToken() {
    const token = await this.openTokenInput();

    if (token) {
      this.token = token;
      this.tokenExpiryDate = new Date();
      this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', this.token);
      this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.tokenExpiryDate', this.tokenExpiryDate);

      await this.login();
    }
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
      vscode.window.showErrorMessage("Login failed: " + error);
    }
  }

  public async logout(): Promise<void> {
    this.context.workspaceState.update('cha0s2nd-vscode-cds.solution', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.organization', null);

    this.discoveryToken = null;
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryToken', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.discoveryTokenExpiryDate', null);
    this.token = null;
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.token', null);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.auth.tokenExpiryDate', null);

    vscode.window.showInformationMessage("Successfully logged out of cds");
  }
}