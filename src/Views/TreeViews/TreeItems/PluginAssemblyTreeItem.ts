import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IPluginAssembly from '../../../Entities/IPluginAssembly';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class PluginAssemblyTreeItem extends vscode.TreeItem {
  public pluginAssemblyId: string;
  public name: string;

  constructor(public pluginAssembly: IPluginAssembly, private organization?: IOrganization, public solution?: ISolution) {
    super(pluginAssembly.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'pluginAssembly';
    this.name = pluginAssembly.name;
    this.pluginAssemblyId = pluginAssembly.pluginassemblyid;
    this.tooltip = pluginAssembly.description || '';

    this.iconPath = {
      light: path.join(__filename, '..', '..', 'media', 'light', 'assembly.png'),
      dark: path.join(__filename, '..', '..', 'media', 'dark', 'assembly.png'),
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/objects/plugin assemblies`);
    }
  }
}