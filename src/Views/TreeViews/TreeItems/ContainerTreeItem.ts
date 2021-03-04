import * as vscode from 'vscode';

export default class ContainerTreeItem extends vscode.TreeItem {
    public logicalName: string;

    constructor(label: string, logicalName: string, contextValue: string) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);

        this.logicalName = logicalName;
        this.contextValue = contextValue;
    }
}