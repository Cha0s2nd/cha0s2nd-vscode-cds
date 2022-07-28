import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IRole from '../../../Entities/IRole';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class RoleTreeItem extends vscode.TreeItem {
  public name: string;

  constructor(public role: IRole, private organization?: IOrganization, public solution?: ISolution) {
    super(role.name);

    this.contextValue = 'role';
    this.name = role.name;
    this.tooltip = role.name || '';

    this.iconPath = {
      light: path.join(__filename, "../../media/light/role.png"),
      dark: path.join(__filename, "../../media/dark/role.png")
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/objects/security roles`);
    }
  }
}