import * as vscode from "vscode";

export default class EntityGeneratorManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public registerCommands(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.entities.generate', async () => { this.generate(); }));
      }
    
      public generate(): void {
          console.log('Generate entities');
      }
}