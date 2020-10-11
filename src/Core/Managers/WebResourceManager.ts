import * as vscode from 'vscode';
import IWebResource from '../../Entities/IWebResource';
import IOrganization from '../../Entities/IOrganization';
import { WebResourceTypes } from '../Enums/WebResourceTypes';
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';

export default class WebResourceManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.getDetails', async (resources: vscode.Uri[]) => { return this.getWebResourceDetails(resources); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deploy', async (resource: vscode.Uri) => { return this.deployWebResource(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deployAll', async (resources: vscode.Uri[]) => { return this.deployAllWebResources(resources); }));
  }

  private async getWebResourceDetailsFromJson(): Promise<IWebResource[] | undefined> {
    if (vscode.workspace.workspaceFolders) {
      for (let workspaceFolder of vscode.workspace.workspaceFolders) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri.path, '**/webResources.json'));
        for (let file of files) {
          const document = await vscode.workspace.openTextDocument(file.path);
          const content = document.getText();
          return JSON.parse(content);
        }
      }
    }
  }

  private async getWebResourcesFromSolution(): Promise<IWebResource[] | undefined> {
    const webResources = new Array<IWebResource>();
    const resources = await WebApi.retrieveMultiplePaged('webresourceSet', ['webresourceid', 'name', 'displayname', 'description', 'webresourcetype', 'solutionid', 'content', 'modifiedon']);
    for (let resource of resources) {
      const fileUri = vscode.Uri.file('WebResources/' + resource.name);

      var buffer = Buffer.from(resource.content, 'base64');
      var array = new Uint8Array(buffer);
      await vscode.workspace.fs.writeFile(fileUri, array);

      webResources.push({
        Description: resource.description,
        ModifiedOn: resource.modifiedon,
        ModifiedOnLocal: new Date(),
        SolutionId: resource.solutionid,
        DisplayName: resource.displayname,
        File: fileUri,
        UniqueName: resource.name,
        WebResourceType: resource.webresourcetype
      });
    }

    return webResources;
  }

  private async getWebResourceDetailsFromProject(): Promise<IWebResource[]> {
    const webResources = new Array<IWebResource>();
    const project = await vscode.commands.executeCommand<any>('cha0s2nd-vscode-cds.project.get');
    for (let itemGroup of project.Project.ItemGroup.filter((ig: any) => ig.CRMWebResource)) {
      webResources.push({
        Description: '',
        ModifiedOn: new Date(),
        ModifiedOnLocal: new Date(),
        SolutionId: '00000000-0000-0000-0000-000000000000',
        DisplayName: itemGroup.DisplayName,
        File: vscode.Uri.file(itemGroup['@Include']),
        UniqueName: itemGroup.UniqueName,
        WebResourceType: WebResourceTypes[itemGroup.WebResourceType as keyof typeof WebResourceTypes]
      });
    }
    return webResources;
  }

  private async getWebResourceDetails(resources: vscode.Uri[]): Promise<IWebResource[]> {
    const webResources = [];
    const details = await this.getWebResourceDetailsFromJson() || [];
    for (let resource of resources) {
      const webResource = details.find((detail: IWebResource) => resource.path === detail.File.path);
      if (webResource) {
        webResources.push(webResource);
      }
    }
    return webResources;
  }

  private async deployWebResource(resource: vscode.Uri) {
    const webResources = await this.getWebResourceDetails([resource]);
    if (webResources.length > 0) {
      this.postWebResource(webResources[0]);
    }
  }

  private async deployAllWebResources(resources: vscode.Uri[]) {
    const webResources = await this.getWebResourceDetails(resources);
    for (let webResource of webResources) {
      this.postWebResource(webResource);
    }
  }

  private async postWebResource(webResource: IWebResource) {
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
    try {
      const response = await WebApi.post('webresourceSet', {
        name: webResource.UniqueName,
        displayname: webResource.DisplayName,
        webresourcetype: webResource.WebResourceType,
        solutionid: solution!.SolutionId
      });

      if (response) {
        console.log("Successfully deployed " + webResource.DisplayName);
      }
    }
    catch (error) {
      console.error("Failed to deploy " + webResource.DisplayName + ": " + error);
    }
  }
}