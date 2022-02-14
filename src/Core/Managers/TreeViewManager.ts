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
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solutionTreeView.changeSolution', (solution: ISolution) => this.changeSolution(solution)));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.defaultSolutionTreeView.refresh', () => this.defaultSolutionProvider?.refresh()));
  }

  public async registerViews(): Promise<void> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
    const defaultSolution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.getDefault');

    if (solution) {
      this.solutionProvider = new SolutionTreeViewDataProvider(org, solution);

      this.solutionTreeView = vscode.window.createTreeView('solution', {
        treeDataProvider: this.solutionProvider
      });

      this.solutionTreeView.title = `${solution.friendlyName} - ${solution.version}`;

      this.solutionProvider.onDidChangeTreeData(async () => {
        const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
        const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
        if (org && solution) {
          await this.changeSolution(solution, org);
        }
      });
    }


    this.defaultSolutionProvider = new SolutionTreeViewDataProvider(org, defaultSolution);
    vscode.window.registerTreeDataProvider('defaultSolution', this.defaultSolutionProvider);
  }

  private async changeSolution(solution: ISolution, organization?: IOrganization): Promise<void> {
    if (!organization) {
      organization = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
    }

    if (this.solutionTreeView) {
      this.solutionTreeView.title = `${solution.friendlyName} - ${solution.version}`;
    }

    this.solutionProvider?.changeSolution(organization, solution);
  }
}