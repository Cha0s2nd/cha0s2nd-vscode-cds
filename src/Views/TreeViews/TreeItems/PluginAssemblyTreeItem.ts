import * as vscode from 'vscode';
import * as path from 'path';
import IPluginAssembly from '../../../Entities/IPluginAssembly';

export default class PluginAssemblyTreeItem extends vscode.TreeItem {
  public pluginAssemblyId: string;
  public name: string;

  constructor(public pluginAssembly: IPluginAssembly) {
    super(pluginAssembly.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'pluginAssembly';
    this.name = pluginAssembly.name;
    this.pluginAssemblyId = pluginAssembly.pluginassemblyid;
    this.tooltip = pluginAssembly.description || '';

    this.iconPath = {
      light: path.join(__filename, '..', '..', 'media', 'light', 'assembly.png'),
      dark: path.join(__filename, '..', '..', 'media', 'dark', 'assembly.png'),
    };
  }
}