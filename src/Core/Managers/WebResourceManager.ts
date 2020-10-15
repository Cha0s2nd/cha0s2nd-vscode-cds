import * as vscode from 'vscode';
import IWebResource from '../../Entities/IWebResource';
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';
import IExtensionMetaData from '../../Entities/IExtensionMetaData';

export default class WebResourceManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.getDetails', async (resources: vscode.Uri[]) => { return this.getWebResourceDetails(resources); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deploy', async (resource: vscode.Uri) => { return this.deployWebResource(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deployAll', async (resources: vscode.Uri[]) => { return this.deployAllWebResources(resources); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.download', async () => { return this.downloadAndMapWebResources(); }));
  }

  private async downloadAndMapWebResources(): Promise<void> {
    const webResources = new Array<IWebResource>();
    const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');

    const resources = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: false,
      title: "Downloading Web Resources..."
    }, (progress) => this.getAllWebResourcesFromSolution());

    let count = 0;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true,
      title: "Creating local files..."
    }, async (progress, token) => {
      for (let resource of resources) {
        if (token.isCancellationRequested) {
          return;
        }

        progress.report({
          message: resource.name,
          increment: count += 100 / resources.length,
        });

        const fileUri = vscode.Uri.file(metaData?.WebResources.Folder + resource.name);

        var buffer = Buffer.from(resource.content, 'base64');
        var array = new Uint8Array(buffer);
        await vscode.workspace.fs.writeFile(fileUri, array);

        webResources.push({
          Description: resource.description,
          ModifiedOn: resource.modifiedon,
          ModifiedOnLocal: new Date(),
          SolutionId: resource.solutionid,
          DisplayName: resource.displayname,
          File: fileUri.fsPath,
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

    await vscode.commands.executeCommand('cha0s2nd-vscode-cds.metadata.set', metaData);
  }

  private async getAllWebResourcesFromSolution(): Promise<any[]> {
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

    return await WebApi.retrieveMultiplePaged(
      'webresourceset',
      [
        'webresourceid',
        'name',
        'displayname',
        'description',
        'webresourcetype',
        'solutionid',
        'content',
        'modifiedon'
      ],
      `solutionid eq '${solution?.SolutionId}'`
    );
  }

  private async getWebResourceDetails(resources: vscode.Uri[]): Promise<IWebResource[]> {
    const webResources = [];
    const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');
    for (let resource of resources) {
      const webResource = metaData?.WebResources.Files.find((file: IWebResource) => file.File === resource.fsPath);
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

      }
    }
    catch (error) {
      vscode.window.showErrorMessage("Failed to deploy " + webResource.DisplayName + ": " + error);
    }
  }
}