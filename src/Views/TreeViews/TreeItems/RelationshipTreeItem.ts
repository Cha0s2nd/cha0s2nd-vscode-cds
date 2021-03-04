import * as vscode from 'vscode';
import IRelationship from '../../../Entities/IRelationship';

export default class RelationshipTreeItem extends vscode.TreeItem {
    public logicalName: string;

    constructor(public relationship: IRelationship) {
        super(relationship.SchemaName);

        this.contextValue = 'relationship';
        this.logicalName = relationship.SchemaName.toLocaleLowerCase();
    }
}