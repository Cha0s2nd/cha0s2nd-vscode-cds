import * as vscode from 'vscode';
import IWebResource from '../../Entities/IWebResource';
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';
import IExtensionMetaData from '../../Entities/IExtensionMetaData';
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
      const webResources = new Array<IWebResource>();
      const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');

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

          const fileUri = vscode.Uri.joinPath(vscode.Uri.file(metaData?.Folder || ''), metaData?.WebResources.Folder || '', resource.name);

          var buffer = Buffer.from(resource.content, 'base64');
          var array = new Uint8Array(buffer);
          await vscode.workspace.fs.writeFile(fileUri, array);

          webResources.push({
            Description: resource.description,
            DisplayName: resource.displayname,
            File: resource.name,
            UniqueName: resource.name,
            WebResourceType: resource.webresourcetype
          });
        }
      });

      for (let resource of metaData?.WebResources.Files || []) {
        if (!webResources.find(wr => wr.UniqueName === resource.UniqueName)) {
          webResources.push(resource);
        }
      }

      if (metaData) {
        metaData.WebResources.Files = webResources;
      }

      await vscode.commands.executeCommand('cha0s2nd-vscode-cds.metadata.set', metaData);
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
      `componenttype eq ${SolutionComponentTypes.WebResource} and _solutionid_value eq '${solution?.SolutionId}'`
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
    const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');

    for (let resource of resources) {
      const webResource = metaData?.WebResources.Files.find((file: IWebResource) => vscode.Uri.joinPath(vscode.Uri.file(metaData?.Folder || ''), metaData?.WebResources.Folder || '', file.File).fsPath === resource.fsPath);

      if (webResource) {
        const document = await vscode.workspace.openTextDocument(resource.path);
        webResource.Content = Buffer.from(document.getText()).toString('base64');
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
          message: `Uploading ${webResources[0].DisplayName}`,
        });

        this.createOrCreateWebResource(webResources[0]);
      }
    });
  }

  private async deployAllWebResources() {
    const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');
    if (metaData) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: "Deploying Web Resources..."
      }, async (progress, token) => {
        let count = 0;
        for (let webResource of metaData.WebResources.Files) {
          progress.report({
            message: `Uploading ${webResource.DisplayName}`,
            increment: count += 100 / metaData.WebResources.Files.length,
          });

          const file = vscode.Uri.joinPath(vscode.Uri.file(metaData.Folder || ''), metaData.WebResources.Folder, webResource.File);
          const document = await vscode.workspace.openTextDocument(file.path);
          webResource.Content = Buffer.from(document.getText()).toString('base64');

          this.createOrCreateWebResource(webResource);
        }
      });
    }
  }

  private async createOrCreateWebResource(webResource: IWebResource) {
    try {
      const resources = await WebApi.retrieveMultiple(
        'webresourceset',
        ['webresourceid'],
        `name eq '${webResource.UniqueName}'`,
        1
      );

      if (resources.length > 0) {
        await WebApi.patch(`webresourceset(${resources[0].webresourceid})`, {
          name: webResource.UniqueName,
          displayname: webResource.DisplayName,
          description: webResource.Description,
          webresourcetype: webResource.WebResourceType,
          content: webResource.Content
        });
      }
      else {
        const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

        const response = await WebApi.post(`webresourceset`, {
          name: webResource.UniqueName,
          displayname: webResource.DisplayName,
          description: webResource.Description,
          webresourcetype: webResource.WebResourceType,
          solutionid: solution?.SolutionId,
          content: webResource.Content
        });

        if (response) {
          await WebApi.post(`AddSolutionComponent`, {
            ComponentId: response.webresourceid,
            ComponentType: SolutionComponentTypes.WebResource,
            SolutionUniqueName: solution?.UniqueName,
            AddRequiredComponents: false,
            DoNotIncludeSubcomponents: false,
            IncludedComponentSettingsValues: null
          });
        }
      }
    }
    catch (error) {
      vscode.window.showErrorMessage("Failed to deploy " + webResource.DisplayName + ": " + error);
    }
  }
}