import * as vscode from 'vscode';
import * as rp from 'request-promise';
import * as Constants from "../Constants/Constants";
import IOrganization from "../../Entities/IOrganization";
import { IAuthToken } from '../../Entities';

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
    const response = await rp(`${Constants.DISCOVERY_URL}/api/discovery/v1.0/Instances`, {
      headers: {
        'Content-Type': 'application/ json',
        'Prefer': 'odata.include-annotations="*"',
        'OData-Version': '4.0',
        'OData-MaxVersion': '4.0',
        'Authorization': 'Bearer ' + (await vscode.commands.executeCommand<IAuthToken>('cha0s2nd-vscode-cds.auth.discoveryToken.get'))?.access_token
      },
      json: true
    });

    if (response) {
      return response.value.map((org: IOrganization) => {
        return { ...org, label: org.FriendlyName, description: org.UniqueName, detail: org.Url, alwaysShow: true };
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
      this.statusBarItem.text = organization.FriendlyName;
      this.statusBarItem.show();
    }
    else {
      this.statusBarItem.hide();
    }
  }
}