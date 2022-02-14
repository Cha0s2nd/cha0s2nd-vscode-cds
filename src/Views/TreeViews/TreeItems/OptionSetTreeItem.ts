import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IOptionSet from '../../../Entities/IOptionSet';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class OptionSetTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(public optionSet: IOptionSet, private organization?: IOrganization, private solution?: ISolution) {
    super(optionSet.Name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'optionSet';
    this.logicalName = optionSet.Name;
    this.tooltip = optionSet.Description?.UserLocalizedLabel?.Label || '';

    this.iconPath = {
      light: path.join(__filename, "../../media/light/choice.png"),
      dark: path.join(__filename, "../../media/dark/choice.png")
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/objects/option sets`);
    }
  }
}