import * as vscode from 'vscode';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class ContainerTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(label: string, logicalName: string, contextValue: string, private organization?: IOrganization, public solution?: ISolution) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);

    this.logicalName = logicalName;
    this.contextValue = contextValue;
  }
}