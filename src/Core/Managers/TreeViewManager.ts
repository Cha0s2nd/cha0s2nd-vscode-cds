import * as vscode from 'vscode';
import IOrganization from '../../Entities/IOrganization';
import ISolution from '../../Entities/ISolution';
import { SolutionTreeViewDataProvider } from '../../Views/TreeViews/SolutionTreeViewDataProvider';

export default class TreeViewManager {
  private context: vscode.ExtensionContext;
  private solutionProvider: SolutionTreeViewDataProvider | undefined;
  private solutionTreeView: vscode.TreeView<vscode.TreeItem> | undefined;
  private defaultSolutionProvider: SolutionTreeViewDataProvider | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solutionTreeView.refresh', () => this.solutionProvider?.refresh()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.defaultSolutionTreeView.refresh', () => this.defaultSolutionProvider?.refresh()));
  }

  public async registerViews(): Promise<void> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');

    this.solutionProvider = new SolutionTreeViewDataProvider(this.context, org, false);

    this.solutionTreeView = vscode.window.createTreeView('solution', {
      treeDataProvider: this.solutionProvider
    });

    this.solutionProvider.onDidChangeTreeData(async () => {
      const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
      if (org) {
        this.defaultSolutionProvider?.changeOrganization(org);
      }
    });

    this.defaultSolutionProvider = new SolutionTreeViewDataProvider(this.context, org, true);
    vscode.window.createTreeView('defaultSolution', {
      treeDataProvider: this.defaultSolutionProvider
    });
  }
}