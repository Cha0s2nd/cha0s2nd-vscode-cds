import * as vscode from 'vscode';
import IOption from '../../../Entities/IOption';

export default class OptionTreeItem extends vscode.TreeItem {
  constructor(public option: IOption) {
    super(`${option.Label.UserLocalizedLabel?.Label}: ${option.Value}`, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'option';
  }
}