import * as vscode from 'vscode';
import IEntityMetadata from "../../../Entities/IEntityMetadata";

export default class EntityTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(public entity: IEntityMetadata) {
    super(entity.LogicalName, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'entity';
    this.logicalName = entity.LogicalName;
    this.tooltip = entity.Description?.UserLocalizedLabel?.Label || '';
  }
}