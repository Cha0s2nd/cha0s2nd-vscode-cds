import * as vscode from 'vscode';
import WebApi from '../Xrm/WebApi';
import IAttributeMetadata from '../../Entities/IAttributeMetadata';
import IEntityMetadata from '../../Entities/IEntityMetadata';
import { AttributeTypes } from '../Enums/AttributeTypes';

export default class EntityGenerationManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.entity.generateAll', async () => { return this.generateEntities(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.entity.generate', async (logicalName: string) => { return this.generateEntity(logicalName); }));
  }

  private async generateEntities(): Promise<void> {
    const entities: string[] = ['account', 'k3c_contract'];
    let content = 'if (typeof(Entities) === "undefined") {\r\n\tEntities = {\r\n';

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true,
      title: "Generating Entities..."
    }, async (progress, token) => {
      let count = 0;
      for (let i = 0; i < entities.length; i++) {
        progress.report({
          message: `Generating ${entities[i]}`,
          increment: count += 100 / entities.length
        });

        content += (i === 0 ? '' : ',\r\n') + this.toSource(await this.generateEntity(entities[i]));
      }
    });

    content += '\r\n\t}\r\n}';

    const document = await vscode.workspace.openTextDocument({ content, language: 'javascript' });
    // await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri);
  }

  private async generateEntity(logicalName: string): Promise<any> {
    const entityMetadata: IEntityMetadata = await new WebApi(this.context).retrieve('EntityDefinitions', `LogicalName='${logicalName}'`, ['SchemaName', 'LogicalCollectionName', 'LogicalName']);

    const entity: any = {
      LogicalName: entityMetadata.LogicalName,
      SchemaName: entityMetadata.SchemaName,
      LogicalCollectionName: entityMetadata.LogicalCollectionName,
      Attributes: {},
      ODataAttributes: {}
    };

    const attributeMetadata: IAttributeMetadata[] = await new WebApi(this.context).retrieveMultiplePaged(`EntityDefinitions(LogicalName='${logicalName}')/Attributes`, ['LogicalName', 'SchemaName', 'AttributeType'], 'AttributeOf eq null');

    for (let attribute of attributeMetadata) {
      if (attribute.LogicalName.indexOf("_base") < 0) {
        let oDataAttribute = attribute.LogicalName;

        if (attribute.AttributeType === AttributeTypes.Lookup) {
          oDataAttribute = `_${oDataAttribute}_value`;
        }

        entity.Attributes[attribute.LogicalName] = attribute.LogicalName;
        entity.ODataAttributes[attribute.LogicalName] = oDataAttribute;
      }
    }
    entity.Attributes = this.sortObject(entity.Attributes);
    entity.ODataAttributes = this.sortObject(entity.ODataAttributes);

    return entity;
  }

  private sortObject(entity: any) {
    let sorted: { [id: string]: string } = {};
    let attribute: string;
    const a = [];

    for (attribute in entity) {
      if (entity.hasOwnProperty(attribute)) {
        a.push(attribute);
      }
    }

    a.sort();

    for (let i = 0; i < a.length; i++) {
      sorted[a[i]] = entity[a[i]];
    }
    return sorted;
  };

  private toSource(entity: any) {
    var str = `\t\t${entity.LogicalName}: {\n`;
    str += `\t\t\tLogicalName: "${entity.LogicalName}",\n`;
    str += `\t\t\tLogicalCollectionName: "${entity.LogicalCollectionName}",\n`;
    str += "\t\t\tAttributes: {\n";
    for (var field in entity.Attributes) {
      str += `\t\t\t\t${field}: "${entity.Attributes[field]}",\n`;
    }
    str += "\t\t\t},\n";
    str += "\t\t\tODataAttributes: {\n";
    for (var field in entity.ODataAttributes) {
      str += `\t\t\t\t${field}: "${entity.ODataAttributes[field]}",\n`;
    }
    str += "\t\t\t}\n";
    str += "\t\t}";

    return str;
  };

  private toOptionSetSource(entity: any) {
    var str = `\t\t${entity.LogicalName}: {\n`;
    for (var optionSet in entity.OptionSets) {
      str += "\t\t\t/** @enum {number} */\n";
      str += `\t\t\t${optionSet}: {\n`;
      var i = 0;
      for (var optionValue in entity.OptionSets[optionSet]) {
        i++;
        str += `\t\t\t\t${optionValue}: ${entity.OptionSets[optionSet][optionValue]}${i < Object.keys(entity.OptionSets[optionSet]).length ? ',' : ''}\n`;
      }
      str += "\t\t\t},\n";
      str += "\n";
    }
    str += "\t\t}";

    return str;
  };
}