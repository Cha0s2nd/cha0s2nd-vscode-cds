import * as vscode from 'vscode';
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
  }
}