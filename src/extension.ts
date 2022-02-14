import * as vscode from 'vscode';
import { AuthProviderType } from './Core/Enums/AuthProviderType';
import DependencyManager from './Core/Managers/DependencyManager';
import EarlyBoundManager from './Core/Managers/EarlyBoundManager';
import OrganizationManager from './Core/Managers/OrganizationManager';
import SolutionManager from './Core/Managers/SolutionManager';
import SpklManager from './Core/Managers/SpklManager';
import SpklSettingManager from './Core/Managers/SpklSettingManager';
import TreeViewManager from './Core/Managers/TreeViewManager';
import WebResourceManager from './Core/Managers/WebResourceManager';
import AuthProvider from './Auth/AuthProvider';
import { WebResourceCodeLensProvider } from './Core/Providers/WebResourceCodeLensProvider';
import IOrganization from './Entities/IOrganization';
import AuthProviderLegacy from './Auth/AuthProviderLegacy';
import PluginManager from './Core/Managers/PluginManager';
import EntityGenerationManager from './Core/Managers/EntityGenerationManager';

export async function activate(context: vscode.ExtensionContext) {
  new DependencyManager(context).checkAll();

  const settingManager = new SpklSettingManager(context);
  settingManager.registerCommands();
  settingManager.registerEvents();
  settingManager.initializeSettings();

  if (vscode.workspace.getConfiguration().get<boolean>('cha0s2nd-vscode-cds.auth.useLegacy')) {
    const authProviderLegacy = new AuthProviderLegacy(context);
    authProviderLegacy.registerCommands();

    vscode.authentication.registerAuthenticationProvider(AuthProviderType.crmonprem, "Dynamics 365 (Legacy)", authProviderLegacy, { supportsMultipleAccounts: false });
  }
  else {
    const authProvider = new AuthProvider(context);
    authProvider.registerCommands();
    vscode.authentication.registerAuthenticationProvider(AuthProviderType.crm, "Dynamics 365", authProvider, { supportsMultipleAccounts: false });
  }

  // Global commands
  context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.link.open', async (treeItem: vscode.TreeItem) => {
    if (treeItem.resourceUri) { await vscode.env.openExternal(treeItem.resourceUri); }
  }));

  new OrganizationManager(context).registerCommands();
  new SolutionManager(context).registerCommands();
  new WebResourceManager(context).registerCommands();
  new PluginManager(context).registerCommands();
  new EntityGenerationManager(context).registerCommands();

  // DLaB.EarlyBoundGenerator used here: https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator
  new EarlyBoundManager(context).registerCommands();

  // Spkl (by Scott Durow) support: https://github.com/scottdurow/SparkleXrm/wiki/spkl
  new SpklManager(context).registerCommands();

  vscode.languages.registerCodeLensProvider({ pattern: '**/*.{css,gif,html,htm,ico,jpg,jpeg,js,png,resx,svg,xap,xml,xsl}' }, new WebResourceCodeLensProvider());

  if (await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get')) {
    const treeViewManager = new TreeViewManager(context);
    treeViewManager.registerCommands();
    treeViewManager.registerViews();
  }
}

export function deactivate(context: vscode.ExtensionContext) {
}