import * as vscode from 'vscode';
import * as child_process from 'child_process';

export default class DependancyManager {
    private context: vscode.ExtensionContext;
    private output: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        this.output = vscode.window.createOutputChannel("Cha0s Data Tools: Dependencies");
    }

    public async checkForCrmUtils() {
        const files = await vscode.workspace.findFiles('**/SolutionPackager.exe');

        if (files.length > 0) {
            for (let file of files) {
                this.context.globalState.get<string>('cha0s2nd-vscode-cds.crmUtilFolder', vscode.Uri.joinPath(file, '..').fsPath);
            }
        }
        else {
            vscode.window.showWarningMessage('SolutionPackager.exe could not be located, please ensure you have the correct nuget packages installed for at least one of the projects.');
        }
    }
}