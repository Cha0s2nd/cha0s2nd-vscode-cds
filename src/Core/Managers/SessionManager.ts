import * as vscode from 'vscode';
import * as Constants from "../Constants/Constants";
import IOrganization from "../../Entities/IOrganization";
import { AuthProviderType } from "../Enums/AuthProviderType";

export default class SessionManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async getAuthToken() {
    if (!(await this.context.secrets.get("authToken"))) {
      return await this.refreshSession();
    }

    return await this.context.secrets.get("authToken");
  }

  public async refreshSession() {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');

    const accessToken = (await vscode.authentication.getSession(AuthProviderType.microsoft, [
      `VSCODE_CLIENT_ID:${Constants.CLIENT_ID}`,
      'VSCODE_TENANT:common',
      'offline_access',
      `${org!.url}//user_impersonation`
    ], { createIfNone: true })).accessToken;

    await this.context.secrets.store("authToken", accessToken);

    return accessToken;
  }
}