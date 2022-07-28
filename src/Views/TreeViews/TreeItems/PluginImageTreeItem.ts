import * as vscode from 'vscode';
import * as path from 'path';
import ISDKMessageProcessingStepImage from '../../../Entities/ISDKMessageProcessingStepImage';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class PluginImageTreeItem extends vscode.TreeItem {
  public name: string;

  constructor(public pluginImage: ISDKMessageProcessingStepImage, private organization?: IOrganization, public solution?: ISolution) {
    super(pluginImage.name, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'pluginImage';
    this.name = pluginImage.name;
    this.tooltip = pluginImage.description || '';

    this.iconPath = {
      light: path.join(__filename, '..', '..', 'media', 'light', 'image.png'),
      dark: path.join(__filename, '..', '..', 'media', 'dark', 'image.png'),
    };
  }
}