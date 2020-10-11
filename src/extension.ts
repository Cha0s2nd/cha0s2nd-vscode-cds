import * as vscode from 'vscode';
import AuthorizationManager from './Auth/AuthorizationManager';
import OrganizationManager from './Core/Managers/OrganizationManager';
import SolutionManager from './Core/Managers/SolutionManager';
import ProjectManager from './Core/Managers/ProjectManager';

export async function activate(context: vscode.ExtensionContext) {
  new AuthorizationManager(context).registerCommands();
  new OrganizationManager(context).registerCommands();
  new SolutionManager(context).registerCommands();
  new ProjectManager(context).registerCommands();

  await vscode.commands.executeCommand('cha0s2nd-vscode-cds.auth.login');
}

export function deactivate() { }