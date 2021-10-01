import * as vscode from 'vscode';
import IAttributeMetaData from '../../../Entities/IAttributeMetadata';

export default class AttributeTreeItem extends vscode.TreeItem {
  public logicalName: string;

  constructor(public attribute: IAttributeMetaData) {
    super(attribute.LogicalName);

    this.contextValue = 'attribute';
    this.logicalName = attribute.LogicalName;
    this.tooltip = attribute.Description?.UserLocalizedLabel?.Label || '';
  }
}