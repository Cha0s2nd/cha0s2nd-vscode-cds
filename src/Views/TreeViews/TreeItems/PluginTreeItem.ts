import * as vscode from 'vscode';
import * as path from 'path';
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

    this.iconPath = {
      light: path.join(__filename, '..', '..', 'media', 'light', 'plugin.png'),
      dark: path.join(__filename, '..', '..', 'media', 'dark', 'plugin.png'),
    };
  }
}