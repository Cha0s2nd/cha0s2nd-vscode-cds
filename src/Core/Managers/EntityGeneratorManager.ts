import * as vscode from "vscode";

export default class EntityGeneratorManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public registerCommands(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.entity.generateJs', async () => { this.generateJavascript("k3c_contract"); }));
        this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.entity.generateTs', async () => { this.generateTypescript("k3c_contract"); }));
    }

    private async generateJavascript(entityLogicalName: string) {
        console.log("Hi daar slaai blaar");
    }

    private async generateTypescript(entityLogicalName: string) {
        console.log("Hi daar slaai blaar");
    }
}