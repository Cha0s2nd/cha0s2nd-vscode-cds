import * as vscode from 'vscode';
import AuthorizationManager from './Auth/AuthorizationManager';
import DependencyManager from './Core/Managers/DependencyManager';
import EarlyBoundManager from './Core/Managers/EarlyBoundManager';
import OrganizationManager from './Core/Managers/OrganizationManager';
import SolutionManager from './Core/Managers/SolutionManager';
import SpklManager from './Core/Managers/SpklManager';
import SpklSettingManager from './Core/Managers/SpklSettingManager';
import TreeViewManager from './Core/Managers/TreeViewManager';
import WebResourceManager from './Core/Managers/WebResourceManager';
import { WebResourceCodeLensProvider } from './Core/Providers/WebResourceCodeLensProvider';

export async function activate(context: vscode.ExtensionContext) {
  new DependencyManager(context).checkAll();

  new AuthorizationManager(context).registerCommands();
  new OrganizationManager(context).registerCommands();
  new SolutionManager(context).registerCommands();
  new WebResourceManager(context).registerCommands();

  // DLaB.EarlyBoundGenerator used here: https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator
  new EarlyBoundManager(context).registerCommands();

  // Spkl (by Scott Durow) support: https://github.com/scottdurow/SparkleXrm/wiki/spkl
  new SpklManager(context).registerCommands();
  new SpklSettingManager(context).registerEvents();

  vscode.languages.registerCodeLensProvider({ pattern: '**/*.{css,gif,html,htm,ico,jpg,jpeg,js,png,resx,svg,xap,xml,xsl}' }, new WebResourceCodeLensProvider());

  if (await context.workspaceState.get('cha0s2nd-vscode-cds.auth.token')) {
    if (await vscode.commands.executeCommand('cha0s2nd-vscode-cds.organization.get')) {
      const treeViewManager = new TreeViewManager(context);
      treeViewManager.registerCommands();
      treeViewManager.registerViews();
    }
  }
}

export function deactivate(context: vscode.ExtensionContext) {
}