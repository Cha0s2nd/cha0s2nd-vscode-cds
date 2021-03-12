import * as vscode from 'vscode';
import ISDKMessageProcessingStepImage from '../../../Entities/ISDKMessageProcessingStepImage';

export default class PluginImageTreeItem extends vscode.TreeItem {
  public name: string;

  constructor(public pluginImage: ISDKMessageProcessingStepImage) {
    super(pluginImage.name, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'pluginImage';
    this.name = pluginImage.name;
    this.tooltip = pluginImage.description || '';
  }
}