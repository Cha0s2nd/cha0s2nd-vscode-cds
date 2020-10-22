import * as vscode from 'vscode';
import AuthorizationManager from './Auth/AuthorizationManager';
import EntityGenerationManager from './Core/Managers/EntityGeneratorManager';
import ExtensionMetaDataManager from './Core/Managers/ExtensionMetaDataManager';
import OrganizationManager from './Core/Managers/OrganizationManager';
import SolutionManager from './Core/Managers/SolutionManager';
import WebResourceManager from './Core/Managers/WebResourceManager';

export async function activate(context: vscode.ExtensionContext) {
  new AuthorizationManager(context).registerCommands();
  new ExtensionMetaDataManager(context).registerCommands();
  new OrganizationManager(context).registerCommands();
  new SolutionManager(context).registerCommands();
  new EntityGenerationManager(context).registerCommands();
  new WebResourceManager(context).registerCommands();

  if (await context.workspaceState.get('cha0s2nd-vscode-cds.auth.token')) {
    if (await vscode.commands.executeCommand('cha0s2nd-vscode-cds.organization.get')) {
      await vscode.commands.executeCommand('cha0s2nd-vscode-cds.solution.get');
    }
  }
}

export function deactivate(context: vscode.ExtensionContext) {
}