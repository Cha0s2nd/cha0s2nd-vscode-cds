import * as vscode from 'vscode';
import * as path from 'path';
import IOption from '../../../Entities/IOption';

export default class OptionTreeItem extends vscode.TreeItem {
  constructor(public option: IOption) {
    super(`${option.Label.UserLocalizedLabel?.Label}: ${option.Value}`, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'option';

    this.iconPath = {
      light: path.join(__filename, "../../media/light/option.png"),
      dark: path.join(__filename, "../../media/dark/option.png")
    };
  }
}