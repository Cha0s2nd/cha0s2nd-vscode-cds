import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IAttributeMetaData from '../../../Entities/IAttributeMetadata';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class AttributeTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(public attribute: IAttributeMetaData, private organization?: IOrganization, private solution?: ISolution) {
    super(attribute.LogicalName);

    this.contextValue = 'attribute';
    this.logicalName = attribute.LogicalName;
    this.tooltip = attribute.Description?.UserLocalizedLabel?.Label || '';

    this.iconPath = {
      light: path.join(__filename, "../../media/light/column.png"),
      dark: path.join(__filename, "../../media/dark/column.png")
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/entities/${solution.organizationId}/${attribute.EntityLogicalName}/#fields`);
    }
  }
}