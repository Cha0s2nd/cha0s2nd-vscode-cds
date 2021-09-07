import * as vscode from 'vscode';
import * as rp from 'request-promise';
import * as Constants from "../Constants/Constants";
import IOrganization from "../../Entities/IOrganization";
import { AuthProviderType } from '../../Core/Enums/AuthProviderType';

export default class OrganizationManager {
  private context: vscode.ExtensionContext;
  private statusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.statusBarItem.command = 'cha0s2nd-vscode-cds.organization.change';
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.organization.change', async () => { return this.changeOrganization(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.organization.get', async () => { return this.getOrganization(); }));
  }

  private async getAvailableOrganizations(): Promise<IOrganization[]> {
    let response = null;

    if (vscode.workspace.getConfiguration().get<boolean>('cha0s2nd-vscode-cds.auth.useLegacy')) {
      response = await rp(`${(await vscode.authentication.getSession(AuthProviderType.crmonprem, ['openid'], { createIfNone: true })).id}/api/discovery/v8.2/Instances`, {
        jar: true,
        headers: {
          'Content-Type': 'application/ json',
          'Prefer': 'odata.include-annotations="*"',
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0'
        },
        json: true
      });
    }
    else {
      response = await rp(`${Constants.DISCOVERY_URL}/api/discovery/v1.0/Instances`, {
        headers: {
          'Content-Type': 'application/ json',
          'Prefer': 'odata.include-annotations="*"',
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
          'Authorization': 'Bearer ' + (await vscode.authentication.getSession(AuthProviderType.crm, [Constants.DISCOVERY_URL + '//user_impersonation'], { createIfNone: true })).accessToken
        },
        json: true
      });
    }

    if (response) {
      return response.value.map((org: any) => {
        return {
          id: org.Id,
          uniqueName: org.UniqueName,
          urlName: org.UrlName,
          friendlyName: org.FriendlyName,
          version: org.Version,
          url: org.Url,
          apiUrl: org.ApiUrl,
          lastUpdated: org.LastUpdated,
          label: org.FriendlyName,
          description: org.UniqueName,
          detail: org.Url,
          alwaysShow: true
        };
      });
    }

    return [];
  }

  private async getOrganization(): Promise<IOrganization | undefined> {
    const org = this.context.workspaceState.get<IOrganization>('cha0s2nd-vscode-cds.organization') || await this.changeOrganization();

    this.updateStatusBar(org);

    return org;
  }

  private async changeOrganization(organization?: IOrganization): Promise<IOrganization | undefined> {
    if (organization === undefined) {
      organization = await vscode.window.showQuickPick<IOrganization>(
        await this.getAvailableOrganizations(), {
        ignoreFocusOut: true,
        canPickMany: false,
        placeHolder: 'Organization',
      });
    }

    this.updateStatusBar(organization);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.organization', organization);
    if (organization) {
      await vscode.commands.executeCommand('cha0s2nd-vscode-cds.solution.change');
    }

    return organization;
  }

  private updateStatusBar(organization?: IOrganization): void {
    if (organization) {
      this.statusBarItem.text = organization.friendlyName;
      this.statusBarItem.show();
    }
    else {
      this.statusBarItem.hide();
    }
  }
}