import * as vscode from 'vscode';
import ISolution from '../../Entities/ISolution';
import { SolutionTreeViewDataProvider } from '../../Views/TreeViews/SolutionTreeViewDataProvider';

export default class TreeViewManager {
  private context: vscode.ExtensionContext;
  private solutionProvider: SolutionTreeViewDataProvider | undefined;
  private defaultSolutionProvider: SolutionTreeViewDataProvider | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solutionTreeView.refresh', () => this.solutionProvider?.refresh()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.defaultSolutionTreeView.refresh', () => this.defaultSolutionProvider?.refresh()));
  }

  public async registerViews(): Promise<void> {
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

    if (solution) {
      this.solutionProvider = new SolutionTreeViewDataProvider(solution);

      const solutionTreeView = vscode.window.createTreeView('solution', {
        treeDataProvider: this.solutionProvider
      });

      solutionTreeView.title = `${solution.friendlyName} - ${solution.version}`;
    }

    this.defaultSolutionProvider = new SolutionTreeViewDataProvider();
    vscode.window.registerTreeDataProvider('defaultSolution', this.defaultSolutionProvider);
  }
}