import * as vscode from 'vscode';
import IAttribute from '../../../Entities/IAttribute';

export default class AttributeTreeItem extends vscode.TreeItem {
    public logicalName: string;

    constructor(public attribute: IAttribute) {
        super(attribute.LogicalName);

        this.contextValue = 'attribute';
        this.logicalName = attribute.LogicalName;
        this.tooltip = attribute.Description?.UserLocalizedLabel?.Label || '';
    }
}