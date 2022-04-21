import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import { StateCodes } from '../../../Core/Enums/StateCodes';
import ISDKMessageProcessingStep from '../../../Entities/ISDKMessageProcessingStep';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class PluginStepTreeItem extends vscode.TreeItem {
  public pluginStepId: string;
  public name: string;

  constructor(public pluginStep: ISDKMessageProcessingStep, private organization?: IOrganization, private solution?: ISolution) {
    super(pluginStep.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'pluginStep';
    this.pluginStepId = pluginStep.sdkmessageprocessingstepid;
    this.name = pluginStep.name;
    this.tooltip = pluginStep.description || '';

    this.iconPath = pluginStep.statecode === StateCodes.Disabled ? this.iconPath = {
      light: path.join(__filename, '..', '..', 'media', 'light', 'disabled.png'),
      dark: path.join(__filename, '..', '..', 'media', 'dark', 'disabled.png'),
    } : this.iconPath = {
      light: path.join(__filename, '..', '..', 'media', 'light', 'step.png'),
      dark: path.join(__filename, '..', '..', 'media', 'dark', 'step.png'),
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/objects/plugin steps`);
    }
  }
}