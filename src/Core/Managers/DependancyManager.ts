import * as vscode from 'vscode';

export default class DependancyManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async checkForSolutionPackager() {
        const files = await vscode.workspace.findFiles('**/SolutionPackager.exe');

        if (files.length > 0) {
            for (let file of files) {
                this.context.workspaceState.update('cha0s2nd-vscode-cds.solutionPackagerFolder', vscode.Uri.joinPath(file, '..').fsPath);
                return;
            }
        }
        else {
            vscode.window.showWarningMessage('SolutionPackager.exe could not be located, please ensure you have the correct nuget packages installed for at least one of the projects.');
        }
    }

    public async checkForCrmUtils() {
        const files = await vscode.workspace.findFiles('**/CrmSvcUtil.exe');

        if (files.length > 0) {
            for (let file of files) {
                this.context.workspaceState.update('cha0s2nd-vscode-cds.crmUtilFolder', vscode.Uri.joinPath(file, '..').fsPath);
                return;
            }
        }
        else {
            vscode.window.showWarningMessage('CrmSvcUtil.exe could not be located, please ensure you have the correct nuget packages installed for at least one of the projects.');
        }
    }

    public async checkForDlaB() {
        const files = await vscode.workspace.findFiles('**/DLaB.CrmSvcUtilExtensions.dll');

        if (files.length > 0) {
            for (let file of files) {
                this.context.workspaceState.update('cha0s2nd-vscode-cds.dlabFolder', vscode.Uri.joinPath(file, '..').fsPath);
                return;
            }
        }
        else {
            vscode.window.showWarningMessage('DLaB.CrmSvcUtilExtensions.dll could not be located, please ensure you have the correct nuget packages installed for at least one of the projects.');
        }
    }
}