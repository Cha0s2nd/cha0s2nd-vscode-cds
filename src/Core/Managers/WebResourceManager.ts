import * as vscode from 'vscode';
import IWebResource from '../../Entities/IWebResource';
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';
import { SolutionComponentTypes } from '../Enums/SolutionComponentTypes';

export default class WebResourceManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.getDetails', async (resources: vscode.Uri[]) => { return this.getWebResourceDetails(resources); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deploy', async (resource: vscode.Uri) => { return this.deployWebResource(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deployAll', async () => { return this.deployAllWebResources(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.download', async () => { return this.downloadAndMapWebResources(); }));
  }

  private async downloadAndMapWebResources(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const webResourceFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.webresources.folder');
      const webResourceMeta = vscode.workspace.getConfiguration().get<IWebResource[]>('cha0s2nd-vscode-cds.webresources.metadata');
      const webResources = new Array<IWebResource>();

      const resources = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Retrieving Web Resources..."
      }, (progress) => this.getAllWebResourcesFromSolution());

      const resourceDetails = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Downloading Web Resource content..."
      }, async (progress, token) => {
        let details: any[] = [];
        const batchSize = 10;
        for (let i = 0; i < resources.length; i += batchSize) {
          if (token.isCancellationRequested) {
            return [];
          }

          details = details.concat(await this.getWebResourceDetailsFromSolution(resources.slice(i, i + batchSize)));

          progress.report({
            message: `Completed: ${i}/${resources.length}`
          });
        }

        return details;
      });

      let count = 0;

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: "Creating local files..."
      }, async (progress, token) => {
        for (let resource of resourceDetails) {
          if (token.isCancellationRequested) {
            return;
          }

          progress.report({
            message: resource.name,
            increment: count += 100 / resources.length,
          });

          const fileUri = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder || '', resource.name);

          var buffer = Buffer.from(resource.content, 'base64');
          var array = new Uint8Array(buffer);
          await vscode.workspace.fs.writeFile(fileUri, array);

          webResources.push({
            description: resource.description,
            displayName: resource.displayname,
            file: resource.name,
            uniqueName: resource.name,
            webResourceType: resource.webresourcetype
          });
        }
      });

      for (let resource of webResourceMeta || []) {
        if (!webResources.find(wr => wr.uniqueName === resource.uniqueName)) {
          webResources.push(resource);
        }
      }

      vscode.workspace.getConfiguration().update('cha0s2nd-vscode-cds.webresources.metadata', webResources);
    }
    catch (error) {
      vscode.window.showErrorMessage(error);
    }
  }

  private async getAllWebResourcesFromSolution(): Promise<string[]> {
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

    return await WebApi.retrieveMultiplePaged(
      'solutioncomponents',
      [
        'objectid'
      ],
      `componenttype eq ${SolutionComponentTypes.WebResource} and _solutionid_value eq '${solution?.solutionId}'`
    ).then(response => response.map(sc => sc.objectid));
  }

  private async getWebResourceDetailsFromSolution(webresourceIds: string[]): Promise<any[]> {
    return await WebApi.retrieveMultiplePaged(
      'webresourceset',
      [
        'webresourceid',
        'name',
        'displayname',
        'description',
        'webresourcetype',
        'content',
      ],
      `Microsoft.Dynamics.CRM.In(PropertyName='webresourceid',PropertyValues=['${webresourceIds.join("','")}'])`
    );
  }

  private async getWebResourceDetails(resources: vscode.Uri[]): Promise<IWebResource[]> {
    const webResources = [];

    for (let resource of resources) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const webResourceFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.webresources.folder');
      const webResourceMeta = vscode.workspace.getConfiguration().get<IWebResource[]>('cha0s2nd-vscode-cds.webresources.metadata') || [];
      const webResource = webResourceMeta.find((file: IWebResource) => vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder || '', file.file).fsPath === resource.fsPath);

      if (webResource) {
        const document = await vscode.workspace.openTextDocument(resource.path);
        webResource.content = Buffer.from(document.getText()).toString('base64');
        webResources.push(webResource);
      }
    }

    return webResources;
  }

  private async deployWebResource(resource: vscode.Uri) {
    const webResources = await this.getWebResourceDetails([resource]);
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true,
      title: "Deploying Web Resource..."
    }, async (progress, token) => {
      if (webResources.length > 0) {
        progress.report({
          message: `Uploading ${webResources[0].displayName}`,
        });

        this.createOrCreateWebResource(webResources[0]);
      }
    });
  }

  private async deployAllWebResources() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
    const webResourceFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.webresources.folder');
    const webResourceMeta = vscode.workspace.getConfiguration().get<IWebResource[]>('cha0s2nd-vscode-cds.webresources.metadata') || [];

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true,
      title: "Deploying Web Resources..."
    }, async (progress, token) => {
      let count = 0;
      for (let webResource of webResourceMeta) {
        progress.report({
          message: `Uploading ${webResource.displayName}`,
          increment: count += 100 / webResourceMeta.length,
        });

        const file = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder || '', webResource.file);
        const document = await vscode.workspace.openTextDocument(file.path);
        webResource.content = Buffer.from(document.getText()).toString('base64');

        this.createOrCreateWebResource(webResource);
      }
    });
  }

  private async createOrCreateWebResource(webResource: IWebResource) {
    try {
      const resources = await WebApi.retrieveMultiple(
        'webresourceset',
        ['webresourceid'],
        `name eq '${webResource.uniqueName}'`,
        1
      );

      if (resources.length > 0) {
        await WebApi.patch(`webresourceset(${resources[0].webresourceid})`, {
          name: webResource.uniqueName,
          displayname: webResource.displayName,
          description: webResource.description,
          webresourcetype: webResource.webResourceType,
          content: webResource.content
        });
      }
      else {
        const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

        const response = await WebApi.post(`webresourceset`, {
          name: webResource.uniqueName,
          displayname: webResource.displayName,
          description: webResource.description,
          webresourcetype: webResource.webResourceType,
          solutionid: solution?.solutionId,
          content: webResource.content
        });

        if (response) {
          await WebApi.post(`AddSolutionComponent`, {
            ComponentId: response.webresourceid,
            ComponentType: SolutionComponentTypes.WebResource,
            SolutionUniqueName: solution?.uniqueName,
            AddRequiredComponents: false,
            DoNotIncludeSubcomponents: false,
            IncludedComponentSettingsValues: null
          });
        }
      }
    }
    catch (error) {
      vscode.window.showErrorMessage("Failed to deploy " + webResource.displayName + ": " + error);
    }
  }
}