import * as vscode from 'vscode';
import { RelationshipTypes } from '../../Core/Enums/RelationshipTypes';
import { SolutionComponentTypes } from '../../Core/Enums/SolutionComponentTypes';
import WebApi from '../../Core/Xrm/WebApi';
import IAttributeMetaData from '../../Entities/IAttributeMetadata';
import IEntityMetadata from '../../Entities/IEntityMetadata';
import IOptionSet from '../../Entities/IOptionSet';
import IOrganization from '../../Entities/IOrganization';
import IPluginAssembly from '../../Entities/IPluginAssembly';
import IPluginType from '../../Entities/IPluginType';
import IRelationship from '../../Entities/IRelationship';
import IRole from '../../Entities/IRole';
import ISDKMessageProcessingStep from '../../Entities/ISDKMessageProcessingStep';
import ISDKMessageProcessingStepImage from '../../Entities/ISDKMessageProcessingStepImage';
import ISolution from '../../Entities/ISolution';
import ISolutionComponent from '../../Entities/ISolutionComponent';
import IWebResource from '../../Entities/IWebResource';
import AttributeTreeItem from './TreeItems/AttributeTreeItem';
import ContainerTreeItem from './TreeItems/ContainerTreeItem';
import EntityTreeItem from './TreeItems/EntityTreeItem';
import OptionSetTreeItem from './TreeItems/OptionSetTreeItem';
import OptionTreeItem from './TreeItems/OptionTreeItem';
import PluginAssemblyTreeItem from './TreeItems/PluginAssemblyTreeItem';
import PluginImageTreeItem from './TreeItems/PluginImageTreeItem';
import PluginStepTreeItem from './TreeItems/PluginStepTreeItem';
import PluginTreeItem from './TreeItems/PluginTreeItem';
import RelationshipTreeItem from './TreeItems/RelationshipTreeItem';
import RoleTreeItem from './TreeItems/RoleTreeItem';
import SolutionTreeItem from './TreeItems/SolutionTreeItem';
import ValueTreeItem from './TreeItems/ValueTreeItem';
import WebResourceTreeItem from './TreeItems/WebResourceTreeItem';

export class SolutionTreeViewDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private organization?: IOrganization, private isDefault?: boolean) { }

  changeOrganization(organization?: IOrganization): void {
    this.organization = organization;
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    let children = new Array<vscode.TreeItem>();

    switch (element?.contextValue) {
      case 'solution':
        const solutionTreeItem = <SolutionTreeItem>element;
        children.push(new ContainerTreeItem('Tables', 'solutioncomponents', 'entityContainer', this.organization, solutionTreeItem.solution));
        children.push(new ContainerTreeItem('Choices', 'solutioncomponents', 'globalOptionSetContainer', this.organization, solutionTreeItem.solution));
        children.push(new ContainerTreeItem('Web Resources', 'solutioncomponents', 'webResourceContainer', this.organization, solutionTreeItem.solution));
        children.push(new ContainerTreeItem('Plug-in Assemblies', 'solutioncomponents', 'assemblyContainer', this.organization, solutionTreeItem.solution));
        children.push(new ContainerTreeItem('Security Roles', 'solutioncomponents', 'roleContainer', this.organization, solutionTreeItem.solution));
        break;
      case 'entityContainer':
        const entityContainerTreeItem = <ContainerTreeItem>element;
        const entities = await this.getEntities(entityContainerTreeItem.solution?.solutionId);
        children = entities.map(entity => new EntityTreeItem(entity, this.organization, entityContainerTreeItem.solution)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'globalOptionSetContainer':
        const globalOptionSetContainerTreeItem = <ContainerTreeItem>element;
        const globalOptionSets = await this.getGlobalOptionSets(globalOptionSetContainerTreeItem.solution?.solutionId);
        children = globalOptionSets.map(globalOptionSet => new OptionSetTreeItem(globalOptionSet, this.organization, globalOptionSetContainerTreeItem.solution)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'webResourceContainer':
        const webResourceContainerTreeItem = <ContainerTreeItem>element;
        const webResources = await this.getWebResources(webResourceContainerTreeItem.solution?.solutionId);
        children = webResources.map(webResource => new WebResourceTreeItem(webResource, this.organization, webResourceContainerTreeItem.solution)).sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'assemblyContainer':
        const assemblyContainerTreeItem = <ContainerTreeItem>element;
        const assemblies = await this.getPluginAssemblies(assemblyContainerTreeItem.solution?.solutionId);
        children = assemblies.map(assembly => new PluginAssemblyTreeItem(assembly, this.organization, assemblyContainerTreeItem.solution)).sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'roleContainer':
        const roleContainerTreeItem = <ContainerTreeItem>element;
        const roles = await this.getRoles(roleContainerTreeItem.solution?.solutionId);
        children = roles.map(role => new RoleTreeItem(role, this.organization, roleContainerTreeItem.solution)).sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'pluginAssembly':
        if (element) {
          const assemblyTreeItem = <PluginAssemblyTreeItem>element;
          const plugins = await this.getPluginTypes(assemblyTreeItem.pluginAssemblyId);
          children = plugins.map(plugin => new PluginTreeItem(plugin, this.organization, assemblyTreeItem.solution)).sort((a, b) => a.typename.localeCompare(b.typename));
        }
        break;
      case 'plugin':
        if (element) {
          const pluginTreeItem = <PluginTreeItem>element;
          const pluginSteps = await this.getPluginSteps(pluginTreeItem.pluginId);
          children = pluginSteps.map(pluginStep => new PluginStepTreeItem(pluginStep, this.organization, pluginTreeItem.solution)).sort((a, b) => a.name.localeCompare(b.name));
        }
        break;
      case 'pluginStep':
        if (element) {
          const pluginStepTreeItem = <PluginStepTreeItem>element;
          const pluginImages = await this.getPluginImages(pluginStepTreeItem.pluginStepId);
          children = pluginImages.map(pluginImage => new PluginImageTreeItem(pluginImage, this.organization, pluginStepTreeItem.solution)).sort((a, b) => a.name.localeCompare(b.name));
        }
        break;
      case 'entity':
        if (element) {
          const entityTreeItem = <EntityTreeItem>element;
          children.push(new ValueTreeItem('Display Name: ' + entityTreeItem.entity.DisplayName?.UserLocalizedLabel?.Label, this.organization, entityTreeItem.solution));
          children.push(new ValueTreeItem('Schema Name: ' + entityTreeItem.entity.SchemaName, this.organization, entityTreeItem.solution));

          children.push(new ContainerTreeItem('Columns', entityTreeItem.logicalName, 'attributeContainer', this.organization, entityTreeItem.solution));
          children.push(new ContainerTreeItem('Choices', entityTreeItem.logicalName, 'optionSetContainer', this.organization, entityTreeItem.solution));
          children.push(new ContainerTreeItem('1:N Relationships', entityTreeItem.logicalName, 'oneToManyContainer', this.organization, entityTreeItem.solution));
          children.push(new ContainerTreeItem('N:1 Relationships', entityTreeItem.logicalName, 'manyToOneContainer', this.organization, entityTreeItem.solution));
          children.push(new ContainerTreeItem('N:N Relationships', entityTreeItem.logicalName, 'manyToManyContainer', this.organization, entityTreeItem.solution));
        }
        break;
      case 'optionSet':
        const optionSetTreeItem = <OptionSetTreeItem>element;
        children = optionSetTreeItem.optionSet.Options.map(option => new OptionTreeItem(option, this.organization, optionSetTreeItem.solution)).sort((a, b) => a.option.Value - b.option.Value);
        break;
      case 'attributeContainer':
        const attributeContainerTreeItem = <ContainerTreeItem>element;
        const attributes = await this.getAttributes(attributeContainerTreeItem.logicalName);
        children = attributes.map((attribute: IAttributeMetaData) => new AttributeTreeItem(attribute, this.organization, attributeContainerTreeItem.solution)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'optionSetContainer':
        const optionSetContainerTreeItem = <ContainerTreeItem>element;
        const optionSets = await this.getOptionSets(optionSetContainerTreeItem.logicalName);
        children = optionSets.map(optionSet => new OptionSetTreeItem(optionSet, this.organization, optionSetContainerTreeItem.solution)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'oneToManyContainer':
        const oneToManyContainerTreeItem = <ContainerTreeItem>element;
        const oneNRelationships = await this.getRelationships(RelationshipTypes.OneToManyRelationship, oneToManyContainerTreeItem.logicalName);
        children = oneNRelationships.map(relationship => new RelationshipTreeItem(relationship, this.organization, oneToManyContainerTreeItem.solution, (<ContainerTreeItem>element).logicalName)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'manyToOneContainer':
        const manyToOneContainerTreeItem = <ContainerTreeItem>element;
        const nOneRelationships = await this.getRelationships(RelationshipTypes.ManyToOneRelationship, manyToOneContainerTreeItem.logicalName);
        children = nOneRelationships.map(relationship => new RelationshipTreeItem(relationship, this.organization, manyToOneContainerTreeItem.solution, (<ContainerTreeItem>element).logicalName)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'manyToManyContainer':
        const manyToManyContainerTreeItem = <ContainerTreeItem>element;
        const nnRelationships = await this.getRelationships(RelationshipTypes.ManyToManyRelationship, manyToManyContainerTreeItem.logicalName);
        children = nnRelationships.map(relationship => new RelationshipTreeItem(relationship, this.organization, manyToManyContainerTreeItem.solution, (<ContainerTreeItem>element).logicalName)).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
        break;
      case 'pluginImage':
      case 'value':
        // No children
        break;
      default:
        if (this.isDefault) {
          const solution = await this.getDefaultSolution();
          children.push(new ContainerTreeItem('Tables', 'solutioncomponents', 'entityContainer', this.organization, solution));
          children.push(new ContainerTreeItem('Choices', 'solutioncomponents', 'globalOptionSetContainer', this.organization, solution));
          children.push(new ContainerTreeItem('Web Resources', 'solutioncomponents', 'webResourceContainer', this.organization, solution));
          children.push(new ContainerTreeItem('Plug-in Assemblies', 'solutioncomponents', 'assemblyContainer', this.organization, solution));
          children.push(new ContainerTreeItem('Security Roles', 'solutioncomponents', 'roleContainer', this.organization, solution));
        }
        else {
          const solutions = await this.getSolutions();
          children = solutions.map(solution => new SolutionTreeItem(solution, this.organization)).sort((a, b) => a.uniqueName.localeCompare(b.uniqueName));
        }
        break;
    }

    return children;
  }

  async getSolutions(): Promise<ISolution[]> {
    const response = <ISolution[]>(await WebApi.retrieveMultiplePaged(
      'solutions',
      [
        '_organizationid_value',
        'uniquename',
        'friendlyname',
        'version'
      ],
      "uniquename ne 'Default' and ismanaged eq false and isvisible eq true"
    ));

    return response.map((solution: any) => {
      return {
        uniqueName: solution.uniquename,
        friendlyName: solution.friendlyname,
        solutionId: solution.solutionid,
        organizationId: solution['_organizationid_value'],
        organizationName: solution['_organizationid_value@OData.Community.Display.V1.FormattedValue'],
        version: solution.version,
        label: solution.friendlyname,
        description: solution.uniquename,
        detail: solution.version,
        alwaysShow: true
      };
    });
  }

  async getDefaultSolution(): Promise<ISolution> {
    const response = <ISolution[]>(await WebApi.retrieveMultiplePaged(
      'solutions',
      [
        '_organizationid_value',
        'uniquename',
        'friendlyname',
        'version'
      ],
      "uniquename eq 'Default'"
    ));

    return response.map((solution: any) => {
      return {
        uniqueName: solution.uniquename,
        friendlyName: solution.friendlyname,
        solutionId: solution.solutionid,
        organizationId: solution['_organizationid_value'],
        organizationName: solution['_organizationid_value@OData.Community.Display.V1.FormattedValue'],
        version: solution.version,
        label: solution.friendlyname,
        description: solution.uniquename,
        detail: solution.version,
        alwaysShow: true
      };
    })[0];
  }

  async getSolutionComponents(solutionId?: string, type?: SolutionComponentTypes): Promise<ISolutionComponent[]> {
    return <ISolutionComponent[]>(await WebApi.retrieveMultiplePaged(
      'solutioncomponents',
      [
        'solutioncomponentid',
        'rootcomponentbehavior',
        'componenttype',
        'rootsolutioncomponentid',
        'objectid'
      ],
      `_solutionid_value eq ${solutionId}${type ? ` and componenttype eq ${type}` : ''}`
    ));
  }

  async getEntities(solutionId?: string): Promise<IEntityMetadata[]> {
    if (solutionId) {
      const components = await this.getSolutionComponents(solutionId, SolutionComponentTypes.Entity);

      let entities = new Array<IEntityMetadata>();

      for (let i = 0; i < components.length; i += 20) {
        let filter = new Array<string>();

        for (let c = 0; c < 20; c++) {
          if (components[c + i]) {
            filter = filter.concat(`MetadataId eq ${components[c + i].objectid}`);
          }
        }

        entities = entities.concat(<IEntityMetadata[]>(await WebApi.retrieveMultiple(
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
          `IsCustomizable/Value eq true and (${filter.join(' or ')})`
        )));
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

  async getAttributes(logicalName: string): Promise<IAttributeMetaData[]> {
    return <IAttributeMetaData[]>(await WebApi.retrieveMultiplePaged(
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

  async getGlobalOptionSets(solutionId?: string): Promise<IOptionSet[]> {
    if (solutionId) {
      const components = await this.getSolutionComponents(solutionId, SolutionComponentTypes.OptionSet);

      let globalOptionSets = new Array<IOptionSet>();

      for (let component of components) {
        globalOptionSets = globalOptionSets.concat(<IOptionSet>(await WebApi.retrieve(
          `GlobalOptionSetDefinitions`,
          component.objectid,
        )));
      }

      return globalOptionSets;
    }
    else {
      return <IOptionSet[]>(await WebApi.retrieveMultiplePaged(
        `GlobalOptionSetDefinitions`
      ));
    }
  }

  async getRoles(solutionId?: string): Promise<IRole[]> {
    if (solutionId) {
      const components = await this.getSolutionComponents(solutionId, SolutionComponentTypes.Role);

      let roles = new Array<IRole>();

      for (let i = 0; i < components.length; i += 20) {
        let filter = new Array<string>();

        for (let c = 0; c < 20; c++) {
          if (components[c + i]) {
            filter = filter.concat(`roleid eq ${components[c + i].objectid}`);
          }
        }

        roles = roles.concat(<IRole[]>(await WebApi.retrieveMultiplePaged(
          `roles`,
          [
            'roleid',
            'name',
            'solutionid',
            'organizationid'
          ],
          `${filter.join(' or ')}`
        )));
      }

      return roles;
    }
    else {
      return <IRole[]>(await WebApi.retrieveMultiplePaged(
        `roles`,
        [
          'roleid',
          'name',
          'solutionid',
          'organizationid'
        ]
      ));
    }
  }

  async getWebResources(solutionId?: string): Promise<IWebResource[]> {
    if (solutionId) {
      const components = await this.getSolutionComponents(solutionId, SolutionComponentTypes.WebResource);

      let webResources = new Array<IWebResource>();

      for (let i = 0; i < components.length; i += 20) {
        let filter = new Array<string>();

        for (let c = 0; c < 20; c++) {
          if (components[c + i]) {
            filter = filter.concat(`webresourceid eq ${components[c + i].objectid}`);
          }
        }

        webResources = webResources.concat(<IWebResource[]>(await WebApi.retrieveMultiplePaged(
          `webresourceset`,
          [
            'webresourceid',
            'displayname',
            'name',
            'solutionid',
            'webresourcetype'
          ],
          `${filter.join(' or ')}`
        )));
      }

      return webResources;
    }
    else {
      return <IWebResource[]>(await WebApi.retrieveMultiplePaged(
        `webresourceset`,
        [
          'webresourceid',
          'displayname',
          'name',
          'solutionid',
          'webresourcetype'
        ],
      ));
    }
  }

  async getPluginAssemblies(solutionId?: string): Promise<IPluginAssembly[]> {
    if (solutionId) {
      const components = await this.getSolutionComponents(solutionId, SolutionComponentTypes.PluginAssembly);

      let assemblies = new Array<IPluginAssembly>();

      for (let i = 0; i < components.length; i += 20) {
        let filter = new Array<string>();

        for (let c = 0; c < 20; c++) {
          if (components[c + i]) {
            filter = filter.concat(`pluginassemblyid eq ${components[c + i].objectid}`);
          }
        }

        assemblies = assemblies.concat(<IPluginAssembly[]>(await WebApi.retrieveMultiplePaged(
          `pluginassemblies`,
          [
            'pluginassemblyid',
            'name',
            'componentstate',
            'culture',
            'description',
            'publickeytoken',
            'solutionid',
            'sourcetype',
            'version',
          ],
          filter.join(' or ')
        )));
      }

      return assemblies;
    }
    else {
      return <IPluginAssembly[]>(await WebApi.retrieveMultiplePaged(
        `pluginassemblies`,
        [
          'pluginassemblyid',
          'name',
          'description',
        ]
      ));
    }
  }

  async getPluginTypes(assemblyId: string): Promise<IPluginType[]> {
    return <IPluginType[]>(await WebApi.retrieveMultiplePaged(
      `plugintypes`,
      [
        'plugintypeid',
        'name',
        'description',
        'friendlyname',
        'isworkflowactivity',
        'typename',
      ],
      `_pluginassemblyid_value eq ${assemblyId}`
    ));
  }

  async getPluginSteps(pluginId: string): Promise<ISDKMessageProcessingStep[]> {
    return <ISDKMessageProcessingStep[]>(await WebApi.retrieveMultiplePaged(
      `sdkmessageprocessingsteps`,
      [
        'sdkmessageprocessingstepid',
        'name',
        'description',
        'statecode'
      ],
      `_plugintypeid_value eq ${pluginId}`
    ));
  }

  async getPluginImages(pluginStepId: string): Promise<ISDKMessageProcessingStepImage[]> {
    return <ISDKMessageProcessingStepImage[]>(await WebApi.retrieveMultiplePaged(
      `sdkmessageprocessingstepimages`,
      [
        'sdkmessageprocessingstepimageid',
        'name',
        'description'
      ],
      `_sdkmessageprocessingstepid_value eq ${pluginStepId}`
    ));
  }
}