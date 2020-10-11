import * as vscode from 'vscode';
import * as rp from 'request-promise';
import IOrganization from "../../Entities/IOrganization";

export default class OrganizationManager {
  private context: vscode.ExtensionContext;
  private statusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.statusBarItem.command = 'cha0s2nd-vscode-xrm.organization.change';
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.organization.change', async () => { return this.changeOrganization(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-xrm.organization.get', async () => { return this.getOrganization(); }));
  }

  private async getAvailableOrganizations(): Promise<IOrganization[]> {
    const response = await rp(vscode.workspace.getConfiguration('cha0s2nd-vscode-xrm.organization', null).get('discoveryUrl') + 'Instances', {
      headers: {
        'Content-Type': 'application/ json',
        'Prefer': 'odata.include-annotations="*"',
        'OData-Version': '4.0',
        'OData-MaxVersion': '4.0',
        'Authorization': 'Bearer ' + await vscode.commands.executeCommand<string>('cha0s2nd-vscode-xrm.auth.token.get')
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
    return this.context.workspaceState.get<IOrganization>('cha0s2nd-vscode-xrm.organization') || await this.changeOrganization();
  }

  private async changeOrganization(): Promise<IOrganization | undefined> {
    const org = await vscode.window.showQuickPick<IOrganization>(
      await this.getAvailableOrganizations(), {
      ignoreFocusOut: true,
      canPickMany: false,
      placeHolder: 'Organization',
    });

    if (org) {
      this.updateStatusBar(org);
      this.context.workspaceState.update('cha0s2nd-vscode-xrm.organization', org);
      await vscode.commands.executeCommand('cha0s2nd-vscode-xrm.solution.change');
      return org;
    }
  }

  private updateStatusBar(organization: IOrganization): void {
    this.statusBarItem.text = organization.FriendlyName;
    this.statusBarItem.show();
  }
}