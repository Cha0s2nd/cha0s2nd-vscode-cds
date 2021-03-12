import * as vscode from 'vscode';
import IPluginType from '../../../Entities/IPluginType';

export default class PluginTreeItem extends vscode.TreeItem {
  public pluginId: string;
  public typename: string;

  constructor(public plugin: IPluginType) {
    super(plugin.typename, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'plugin';
    this.pluginId = plugin.plugintypeid;
    this.typename = plugin.typename;
    this.tooltip = plugin.description || '';
  }
}