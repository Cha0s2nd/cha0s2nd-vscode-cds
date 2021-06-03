import * as vscode from "vscode";
import IWebResource from "../../Entities/IWebResource";

export class WebResourceCodeLensProvider implements vscode.CodeLensProvider {
  onDidChangeCodeLenses?: vscode.Event<void> | undefined;

  public async resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
    const metadata = await vscode.commands.executeCommand<IWebResource[]>('cha0s2nd-vscode-cds.webresource.getMetadata', [codeLens.command?.arguments?.find(arg => arg)]) || [];

    switch (codeLens.command?.command) {
      case 'cha0s2nd-vscode-cds.webresource.setName':
        codeLens.command.title = `Unique Name${metadata[0].uniqueName ? ': ' + metadata[0].uniqueName : ''}`;
        break;
      case 'cha0s2nd-vscode-cds.webresource.setDisplayName':
        codeLens.command.title = `Display Name${metadata[0].uniqueName ? ': ' + metadata[0].displayName : ''}`;
        break;
    }

    return codeLens;
  }

  public async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    const metadata = await vscode.commands.executeCommand<IWebResource[]>('cha0s2nd-vscode-cds.webresource.getMetadata', [document.uri]) || [];

    return [
      new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        title: 'Web Resource Metadata',
        command: ''
      }),
      new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        title: `Unique Name${metadata[0].uniqueName ? ': ' + metadata[0].uniqueName : ''}`,
        command: 'cha0s2nd-vscode-cds.webresource.setName',
        arguments: [document.uri]
      }),
      new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        title: `Display Name${metadata[0].displayName ? ': ' + metadata[0].displayName : ''}`,
        command: 'cha0s2nd-vscode-cds.webresource.setDisplayName',
        arguments: [document.uri]
      })
    ];
  }
}