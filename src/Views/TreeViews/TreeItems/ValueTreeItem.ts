import * as vscode from 'vscode';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class ValueTreeItem extends vscode.TreeItem {
  constructor(label: string, private organization?: IOrganization, public solution?: ISolution) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'value';
  }
}