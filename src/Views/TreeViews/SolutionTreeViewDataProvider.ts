import * as vscode from 'vscode';
import { RelationshipTypes } from '../../Core/Enums/RelationshipTypes';
import { SolutionComponentTypes } from '../../Core/Enums/SolutionComponentTypes';
import WebApi from '../../Core/xrm/WebApi';
import IAttribute from '../../Entities/IAttribute';
import IEntityMetadata from '../../Entities/IEntityMetadata';
import IOptionSet from '../../Entities/IOptionSet';
import IRelationship from '../../Entities/IRelationship';
import ISolution from '../../Entities/ISolution';
import ISolutionComponent from '../../Entities/ISolutionComponent';
import AttributeTreeItem from './TreeItems/AttributeTreeItem';
import ContainerTreeItem from './TreeItems/ContainerTreeItem';
import EntityTreeItem from './TreeItems/EntityTreeItem';
import OptionSetTreeItem from './TreeItems/OptionSetTreeItem';
import OptionTreeItem from './TreeItems/OptionTreeItem';
import RelationshipTreeItem from './TreeItems/RelationshipTreeItem';
import ValueTreeItem from './TreeItems/ValueTreeItem';

export class SolutionTreeViewDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  constructor(private solution?: ISolution) { }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    let children = new Array<vscode.TreeItem>();

    switch (element?.contextValue) {
      case 'entityContainer':
        let entities = new Array<IEntityMetadata>();
        if (this.solution) {
          const entityComponents = await this.getSolutionComponents(SolutionComponentTypes.Entity);
          entities = await this.getEntities(entityComponents.map(c => c.objectid));
        } else {
          entities = await this.getEntities();
        }
        children = entities.map(entity => new EntityTreeItem(entity)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'globatOptionSetContainer':
        let globalOptionSets = new Array<IOptionSet>();
        if (this.solution) {
          const optionSetComponents = await this.getSolutionComponents(SolutionComponentTypes.OptionSet);
          globalOptionSets = await this.getGlobalOptionSets(optionSetComponents.map(c => c.objectid));
        }
        else {
          globalOptionSets = await this.getGlobalOptionSets();
        }
        children = globalOptionSets.map(globalOptionSets => new OptionSetTreeItem(globalOptionSets)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'entity':
        if (element) {
          const entityTreeItem = <EntityTreeItem>element;
          children.push(new ValueTreeItem('Display Name: ' + entityTreeItem.entity.DisplayName?.UserLocalizedLabel?.Label));
          children.push(new ValueTreeItem('Schema Name: ' + entityTreeItem.entity.SchemaName));

          children.push(new ContainerTreeItem('Attributes', entityTreeItem.logicalName, 'attributeContainer'));
          children.push(new ContainerTreeItem('Choices', entityTreeItem.logicalName, 'optionSetContainer'));
          children.push(new ContainerTreeItem('1:N Relationships', entityTreeItem.logicalName, 'oneToManyContainer'));
          children.push(new ContainerTreeItem('N:1 Relationships', entityTreeItem.logicalName, 'manyToOneContainer'));
          children.push(new ContainerTreeItem('N:N Relationships', entityTreeItem.logicalName, 'manyToManyContainer'));
        }
        break;
      case 'optionSet':
        children = (<OptionSetTreeItem>element).optionSet.Options.map(option => new OptionTreeItem(option)).sort((a, b) => a.option.Value - b.option.Value);
        break;
      case 'attributeContainer':
        const attributes = await this.getAttributes((<ContainerTreeItem>element).logicalName);
        children = attributes.map(attribute => new AttributeTreeItem(attribute)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'optionSetContainer':
        const optionSets = await this.getOptionSets((<ContainerTreeItem>element).logicalName);
        children = optionSets.map(optionSet => new OptionSetTreeItem(optionSet)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'oneToManyContainer':
        const oneNRelationships = await this.getRelationships(RelationshipTypes.OneToManyRelationship, (<ContainerTreeItem>element).logicalName);
        children = oneNRelationships.map(relationship => new RelationshipTreeItem(relationship)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'manyToOneContainer':
        const nOneRelationships = await this.getRelationships(RelationshipTypes.ManyToOneRelationship, (<ContainerTreeItem>element).logicalName);
        children = nOneRelationships.map(relationship => new RelationshipTreeItem(relationship)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'manyToManyContainer':
        const nnRelationships = await this.getRelationships(RelationshipTypes.ManyToManyRelationship, (<ContainerTreeItem>element).logicalName);
        children = nnRelationships.map(relationship => new RelationshipTreeItem(relationship)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'value':
        // No children
        break;
      default:
        children.push(new ContainerTreeItem('Tables', 'solutioncomponents', 'entityContainer'));
        children.push(new ContainerTreeItem('Choices', 'solutioncomponents', 'globatOptionSetContainer'));
        break;
    }

    return children;
  }

  async getSolutionComponents(type?: SolutionComponentTypes): Promise<ISolutionComponent[]> {
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

    return <ISolutionComponent[]>(await WebApi.retrieveMultiplePaged(
      'solutioncomponents',
      [
        'solutioncomponentid',
        'rootcomponentbehavior',
        'componenttype',
        'rootsolutioncomponentid',
        'objectid'
      ],
      `_solutionid_value eq ${solution?.solutionId}${type ? ` and componenttype eq ${type}` : ''}`
    ));
  }

  async getEntities(metadataIds?: string[]): Promise<IEntityMetadata[]> {
    if (metadataIds) {
      const entities = [];

      for (let id of metadataIds) {
        entities.push(await this.getEntity(id));
      }

      return entities;
    }
    else {
      return <IEntityMetadata[]>(await WebApi.retrieveMultiplePaged(
        'EntityDefinitions',
        [
          'MetadataId',
          'LogicalName',
          'ObjectTypeCode',
          'SchemaName',
          'LogicalCollectionName',
          'CollectionSchemaName',
          'EntitySetName',
          'Description',
          'DisplayCollectionName',
          'DisplayName'
        ],
        'IsCustomizable/Value eq true'));
    }
  }

  async getEntity(metadataId: string): Promise<IEntityMetadata> {
    return <IEntityMetadata>(await WebApi.retrieve(
      'EntityDefinitions',
      metadataId,
      [
        'MetadataId',
        'LogicalName',
        'ObjectTypeCode',
        'SchemaName',
        'LogicalCollectionName',
        'CollectionSchemaName',
        'EntitySetName',
        'Description',
        'DisplayCollectionName',
        'DisplayName'
      ]));
  }

  async getAttributes(logicalName: string): Promise<IAttribute[]> {
    return <IAttribute[]>(await WebApi.retrieveMultiplePaged(
      `EntityDefinitions(LogicalName='${logicalName}')/Attributes`,
      [
        'MetadataId',
        'EntityLogicalName',
        'IsPrimaryId',
        'IsPrimaryName',
        'LogicalName',
        'SchemaName',
        'AttributeType',
        'Description',
        'DisplayName'
      ]));
  }

  async getGlobalOptionSets(metadataIds?: string[]): Promise<IOptionSet[]> {
    if (metadataIds) {
      const optionSets = [];

      for (let id of metadataIds) {
        optionSets.push(await this.getGlobalOptionSet(id));
      }

      return optionSets;
    }
    else {
      return <IOptionSet[]>(await WebApi.retrieveMultiplePaged(
        `GlobalOptionSetDefinitions`
      ));
    }
  }

  async getGlobalOptionSet(metadataId: string): Promise<IOptionSet> {
    return <IOptionSet>(await WebApi.retrieve(
      `GlobalOptionSetDefinitions`,
      metadataId
    ));
  }

  async getOptionSets(logicalName: string): Promise<IOptionSet[]> {
    return <IOptionSet[]>(await WebApi.retrieveMultiplePaged(
      `EntityDefinitions(LogicalName='${logicalName}')/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata`,
      ['OptionSet'],
      null,
      null,
      '$expand=OptionSet'
    )).map(attribute => attribute.OptionSet);
  }

  async getRelationships(relationshipType: RelationshipTypes, logicalName: string): Promise<IRelationship[]> {
    return <IRelationship[]>(await WebApi.retrieveMultiplePaged(
      `EntityDefinitions(LogicalName='${logicalName}')/${relationshipType}s`,
      null,
      'IsCustomizable/Value eq true'
    ));
  }
}