import * as vscode from 'vscode';

export default class ProjectManager {
  private get crmProjectTypeGuid() { return '{88A30576-7583-4F75-8136-5EFD2C14ADFF}'; }

  private context: vscode.ExtensionContext;
  private project: any;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands() {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.project.get', async () => { return this.getProject(); }));
  }

  private async getProject(): Promise<any> {
    if (!this.project) {
      if (vscode.workspace.workspaceFolders) {
        for (let workspacefolder of vscode.workspace.workspaceFolders) {
          // const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspacefolder.uri.path, '**/*.csproj'));
          // for (let file of files) {
          //   const document = await vscode.workspace.openTextDocument(file.path);
          //   const content = document.getText();
          //   const project = parser.parse(content, { ignoreAttributes: false, attributeNamePrefix: '@' });

          //   if (
          //     project.Project &&
          //     project.Project.PropertyGroup &&
          //     project.Project.PropertyGroup.find((group: any) => group.ProjectTypeGuids && group.ProjectTypeGuids.toUpperCase() === this.crmProjectTypeGuid)) {
          //     this.project = project;
          //   }
          // }
        }
      }
    }
    return this.project;
  }
}