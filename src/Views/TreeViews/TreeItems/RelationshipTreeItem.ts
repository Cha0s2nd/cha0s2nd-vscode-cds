import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IRelationship from '../../../Entities/IRelationship';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class RelationshipTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(public relationship: IRelationship, private organization?: IOrganization, private solution?: ISolution, private entityLogicalName?: string) {
    super(relationship.SchemaName);

    this.contextValue = 'relationship';
    this.logicalName = relationship.SchemaName.toLocaleLowerCase();

    this.iconPath = {
      light: path.join(__filename, "../../media/light/relationship.png"),
      dark: path.join(__filename, "../../media/dark/relationship.png")
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/entities/${solution.organizationId}/${entityLogicalName}#relationships`);
    }
  }
}