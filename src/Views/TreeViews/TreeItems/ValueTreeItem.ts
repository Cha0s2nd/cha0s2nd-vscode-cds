import * as vscode from 'vscode';

export default class ValueTreeItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.contextValue = 'value';
    }
}