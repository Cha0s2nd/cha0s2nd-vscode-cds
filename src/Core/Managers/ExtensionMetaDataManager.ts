import { isDate } from "util";
import * as vscode from "vscode";
import IExtensionMetaData from "../../Entities/IExtensionMetaData";
import ISolution from "../../Entities/ISolution";

export default class ExtensionMetaDataManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.metadata.get', async () => { return this.getMetaDataFromFile(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.metadata.set', async (metaData: IExtensionMetaData) => { return this.saveMetaDataToFile(metaData); }));
  }

  private async getMetaDataFromFile(): Promise<IExtensionMetaData | undefined> {
    if (vscode.workspace.workspaceFolders) {
      for (let workspaceFolder of vscode.workspace.workspaceFolders) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri.path, '**/cds-tools.json'));
        for (let file of files) {
          const document = await vscode.workspace.openTextDocument(file.path);
          const content = document.getText();
          try {
            return <IExtensionMetaData>JSON.parse(content);
          }
          catch {
            const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

            return {
              Solution: solution?.UniqueName || 'Default Solution',
              WebResources: {
                Folder: '/WebResources',
                Files: []
              }
            };
          }
        }
      }
    }
  }

  private async saveMetaDataToFile(metaData: IExtensionMetaData): Promise<void> {
    if (vscode.workspace.workspaceFolders) {
      for (let workspaceFolder of vscode.workspace.workspaceFolders) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri.path, '**/cds-tools.json'));
        for (let file of files) {
          var buffer = Buffer.from(JSON.stringify(metaData), 'utf-8');
          var array = new Uint8Array(buffer);
          await vscode.workspace.fs.writeFile(file, array);
        }
      }
    }
  }
}