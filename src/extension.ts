import * as vscode from 'vscode';
import AuthorizationManager from './Auth/AuthorizationManager';
import OrganizationManager from './Core/Managers/OrganizationManager';
import SolutionManager from './Core/Managers/SolutionManager';
import WebResourceManager from './Core/Managers/WebResourceManager';

export async function activate(context: vscode.ExtensionContext) {
  new AuthorizationManager(context).registerCommands();
  new OrganizationManager(context).registerCommands();
  new SolutionManager(context).registerCommands();
  new WebResourceManager(context).registerCommands();

  const org = await vscode.commands.executeCommand('cha0s2nd-vscode-cds.organization.get');
  if (org) {
    await vscode.commands.executeCommand('cha0s2nd-vscode-cds.solution.get');
  }
}

export function deactivate() { }