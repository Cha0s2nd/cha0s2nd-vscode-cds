import * as vscode from 'vscode';
import ISDKMessageProcessingStep from '../../../Entities/ISDKMessageProcessingStep';

export default class PluginStepTreeItem extends vscode.TreeItem {
  public pluginStepId: string;
  public name: string;

  constructor(public pluginStep: ISDKMessageProcessingStep) {
    super(pluginStep.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'pluginStep';
    this.pluginStepId = pluginStep.sdkmessageprocessingstepid;
    this.name = pluginStep.name;
    this.tooltip = pluginStep.description || '';
  }
}