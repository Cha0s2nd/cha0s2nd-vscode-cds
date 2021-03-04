import * as vscode from 'vscode';
import IOptionSet from '../../../Entities/IOptionSet';

export default class OptionSetTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(public optionSet: IOptionSet) {
    super(optionSet.Name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'optionSet';
    this.logicalName = optionSet.Name;
    this.tooltip = optionSet.Description?.UserLocalizedLabel?.Label || '';
  }
}