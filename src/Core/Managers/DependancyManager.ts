import * as vscode from 'vscode';

export default class DependancyManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async checkForCrmUtils() {
        this.context.globalState.update('cha0s2nd-vscode-cds.crmUtilFolder', 'C:\\Users\\FRossouw\\.nuget\\packages\\microsoft.crmsdk.coretools\\9.1.0.49');
    }
}