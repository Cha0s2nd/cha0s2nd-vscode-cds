import * as vscode from 'vscode';
import AuthorizationManager from './Auth/AuthorizationManager';
import DependencyManager from './Core/Managers/DependencyManager';
import EarlyBoundManager from './Core/Managers/EarlyBoundManager';
import OrganizationManager from './Core/Managers/OrganizationManager';
import PluginManager from './Core/Managers/PluginManager';
import SolutionManager from './Core/Managers/SolutionManager';
import SpklManager from './Core/Managers/SpklManager';
import WebResourceManager from './Core/Managers/WebResourceManager';
import { WebResourceCodeLensProvider } from './Core/Providers/WebResourceCodeLensProvider';
import ISolution from './Entities/ISolution';
import { SolutionTreeViewDataProvider } from './Views/TreeViews/SolutionTreeViewDataProvider';

export async function activate(context: vscode.ExtensionContext) {
  new DependencyManager(context).checkAll();

  new AuthorizationManager(context).registerCommands();
  new OrganizationManager(context).registerCommands();
  new SolutionManager(context).registerCommands();
  new WebResourceManager(context).registerCommands();
  new PluginManager(context).registerCommands();

  // DLaB.EarlyBoundGenerator used here: https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator
  new EarlyBoundManager(context).registerCommands();

  // Spkl (by Scott Durow) support: https://github.com/scottdurow/SparkleXrm/wiki/spkl
  new SpklManager(context).registerCommands();

  vscode.languages.registerCodeLensProvider({ pattern: '**/*.{css,gif,html,htm,ico,jpg,jpeg,js,png,resx,svg,xap,xml,xsl}' }, new WebResourceCodeLensProvider());

  if (await context.workspaceState.get('cha0s2nd-vscode-cds.auth.token')) {
    if (await vscode.commands.executeCommand('cha0s2nd-vscode-cds.organization.get')) {
      const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

      if (solution) {
        const solutionTreeView = vscode.window.createTreeView('solution', {
          treeDataProvider: new SolutionTreeViewDataProvider(solution)
        });

        solutionTreeView.title = `${solution.friendlyName} - ${solution.version}`;
      }

      vscode.window.registerTreeDataProvider('defaultSolution', new SolutionTreeViewDataProvider());
    }
  }
}

export function deactivate(context: vscode.ExtensionContext) {
}