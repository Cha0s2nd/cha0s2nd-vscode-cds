import * as vscode from 'vscode';
import * as rp from 'request-promise';
import IOrganization from "../../Entities/IOrganization";
import ISolution from '../../Entities/ISolution';

export default class SolutionManager {
  private context: vscode.ExtensionContext;
  private statusBarItem: vscode.StatusBarItem;
  public availableSolutions: ISolution[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.statusBarItem.command = 'cha0s2nd-vscode-cds.solution.change';
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.get', async () => { return await this.getSolution(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.change', async () => { return await this.changeSolution(); }));
  }

  private async getAvailableSolutions(): Promise<ISolution[]> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');

    const response = await rp(org!.Url + '/api/data/v' + org!.Version.substring(0, 1) + '.0/solutions?$select=_organizationid_value,uniquename,friendlyname&$filter=ismanaged eq false and isvisible eq true', {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'odata.include-annotations="*"',
        'OData-Version': '4.0',
        'OData-MaxVersion': '4.0',
        'Authorization': 'Bearer ' + await vscode.commands.executeCommand<string>('cha0s2nd-vscode-cds.auth.organizationToken.get', org)
      },
      json: true
    });

    if (response) {
      return response.value.map((solution: any) => {
        return {
          UniqueName: solution.uniquename,
          FriendlyName: solution.friendlyname,
          SolutionId: solution.solutionid,
          OrganizationId: solution['_organizationid_value'],
          OrganizationName: solution['_organizationid_value@OData.Community.Display.V1.FormattedValue'],
          label: solution.friendlyname,
          description: solution.uniquename,
          alwaysShow: true
        };
      });
    }

    return [];
  }

  private async getSolution(): Promise<ISolution | undefined> {
    const solution = this.context.workspaceState.get<ISolution>('cha0s2nd-vscode-cds.solution') || await this.changeSolution();

    this.updateStatusBar(solution);

    return solution;
  }

  private async changeSolution(solution?: ISolution): Promise<ISolution | undefined> {
    if (solution === undefined) {
      solution = await vscode.window.showQuickPick<ISolution>(
        await this.getAvailableSolutions(), {
        ignoreFocusOut: true,
        canPickMany: false,
        placeHolder: 'Solution',
      });
    }

    this.updateStatusBar(solution);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.solution', solution);
    return solution;
  }

  private updateStatusBar(solution?: ISolution): void {
    if (solution) {
      this.statusBarItem.text = solution.FriendlyName;
      this.statusBarItem.show();
    }
    else {
      this.statusBarItem.hide();
    }
  }
}