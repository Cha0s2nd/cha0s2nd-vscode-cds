import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class SolutionTreeItem extends vscode.TreeItem {
  public uniqueName: string;

  constructor(public solution: ISolution, private organization?: IOrganization) {
    super(solution.friendlyName, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'solution';
    this.uniqueName = solution.uniqueName;
    this.description = solution.version;

    this.iconPath = {
      light: path.join(__filename, "../../media/light/solution.png"),
      dark: path.join(__filename, "../../media/dark/solution.png")
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}`);
    }
  }
}