import * as vscode from 'vscode';
import IWebResource from '../../Entities/IWebResource';
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';
import ICDSMetaData from '../../Entities/ICDSMetaData';
import { WebResourceTypes } from '../enums/WebResourceTypes';

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

  private async getWebResourceDetailsFromJson(): Promise<IWebResource[] | undefined> {
    if (vscode.workspace.workspaceFolders) {
      for (let workspaceFolder of vscode.workspace.workspaceFolders) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri.path, '**/cds-tools.json'));
        for (let file of files) {
          const document = await vscode.workspace.openTextDocument(file.path);
          const content = document.getText();
          return (<ICDSMetaData>JSON.parse(content || '{}')).WebResources;
        }
      }
    }
  }

  private async downloadAndMapWebResources(): Promise<void> {
    const webResources = new Array<IWebResource>();
    const jsonWebResources = await this.getWebResourceDetailsFromJson();

    let metaFile: vscode.Uri | null = null;
    let metaData: ICDSMetaData | null = null;

    if (vscode.workspace.workspaceFolders) {
      for (let workspaceFolder of vscode.workspace.workspaceFolders) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri.path, '**/cds-tools.json'));
        for (let file of files) {
          metaFile = file;
          const document = await vscode.workspace.openTextDocument(file.path);
          const content = document.getText();
          metaData = <ICDSMetaData>JSON.parse(content || '{}');
          break;
        }
      }
    }

    const resources = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: false,
      title: "Downloading Web Resources..."
    }, (progress) => this.getWebResourcesFromSolution());

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
          increment: 1,
        });

        const fileUri = vscode.Uri.file('/WebResources/' + resource.name);

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
    });

    for (let jresource of jsonWebResources || []) {
      if (!webResources.find(wr => wr.UniqueName === jresource.UniqueName)) {
        webResources.push(jresource);
      }
    }

    if (metaFile && metaData) {
      metaData.WebResources = webResources;
      var buffer = Buffer.from(JSON.stringify(metaData), 'utf-8');
      var array = new Uint8Array(buffer);
      await vscode.workspace.fs.writeFile(metaFile, array);
    }
  }

  private async getWebResourcesFromSolution(): Promise<any[]> {
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
      ['webresourcetype eq ', WebResourceTypes.HTML, ' or webresourcetype eq ', WebResourceTypes.JScript].join('')
    );
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