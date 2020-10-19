import * as vscode from "vscode";
import IExtensionMetaData from "../../Entities/IExtensionMetaData";

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
            let metaData = <IExtensionMetaData>JSON.parse(content);
            metaData.FileLocation = file.fsPath.replace('cds-tools.json', '');
            return metaData;
          }
          catch {
            return {
              FileLocation: file.fsPath.replace('cds-tools.json', ''),
              WebResources: {
                Folder: '\\WebResources',
                Files: []
              },
              Solution: {
                Folder: '',
                ZipFolder: '',
                ExportManaged: false,
                ExportUnManaged: false
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
          metaData.FileLocation = undefined;
          var buffer = Buffer.from(JSON.stringify(metaData), 'utf-8');
          var array = new Uint8Array(buffer);
          await vscode.workspace.fs.writeFile(file, array);
          const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', file, { tabSize: vscode.workspace.getConfiguration().get("editor.tabSize") || 2, insertSpaces: vscode.workspace.getConfiguration().get("editor.insertSpaces") || true });
          if (edits !== undefined) {
            let formatEdit = new vscode.WorkspaceEdit();
            formatEdit.set(file, edits);
            vscode.workspace.applyEdit(formatEdit);
            vscode.workspace.saveAll();
          }
        }
      }
    }
  }
}