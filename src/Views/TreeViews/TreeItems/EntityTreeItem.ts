import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IEntityMetadata from "../../../Entities/IEntityMetadata";
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class EntityTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(public entity: IEntityMetadata, private organization?: IOrganization, public solution?: ISolution) {
    super(entity.LogicalName, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'entity';
    this.logicalName = entity.LogicalName;
    this.tooltip = entity.Description?.UserLocalizedLabel?.Label || '';

    this.iconPath = {
      light: path.join(__filename, "../../media/light/table.png"),
      dark: path.join(__filename, "../../media/dark/table.png")
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/entities/${solution.organizationId}/${entity.LogicalName}`);
    }
  }
}