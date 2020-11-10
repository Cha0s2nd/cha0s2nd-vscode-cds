import * as vscode from 'vscode';
import * as path from 'path';
import IWebResource from '../../Entities/IWebResource';
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';
import { SolutionComponentTypes } from '../Enums/SolutionComponentTypes';
import { WebResourceTypes } from '../enums/WebResourceTypes';

export default class WebResourceManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.getDetails', async (resources: vscode.Uri[]) => { return this.getWebResourceDetails(resources); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.setName', async (resource: vscode.Uri) => { return this.setWebResourceName(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.setDisplayName', async (resource: vscode.Uri) => { return this.setWebResourceDisplayName(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.setDescription', async (resource: vscode.Uri) => { return this.setWebResourceDescription(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deploy', async (resource: vscode.Uri) => { return this.deployWebResource(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deployAll', async () => { return this.deployAllWebResources(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.download', async () => { return this.downloadAndMapWebResources(); }));
  }

  private async setWebResourceDisplayName(resource: vscode.Uri) {
    let metadata = await this.getWebResourceDetails([resource]);

    const name = await vscode.window.showInputBox({
      placeHolder: 'Display Name',
      value: metadata[0].displayName
    });

    if (name !== undefined) {
      metadata[0].displayName = name;
      this.setWebResourceDetails(metadata);
    }
  }

  private async setWebResourceName(resource: vscode.Uri) {
    let metadata = await this.getWebResourceDetails([resource]);

    const name = await vscode.window.showInputBox({
      placeHolder: 'Unique Name',
      value: metadata[0].uniqueName
    });

    if (name !== undefined) {
      metadata[0].uniqueName = name;
      this.setWebResourceDetails(metadata);
    }
  }

  private async setWebResourceDescription(resource: vscode.Uri) {
    let metadata = await this.getWebResourceDetails([resource]);

    const desc = await vscode.window.showInputBox({
      placeHolder: 'Description',
      value: metadata[0].description
    });

    if (desc !== undefined) {
      metadata[0].description = desc;
      this.setWebResourceDetails(metadata);
    }
  }

  private async getWebResourceMetadata(): Promise<IWebResource[]> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const file = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), '.vscode', 'cds-webresources.json');
      const document = await vscode.workspace.openTextDocument(file.path);
      return JSON.parse(document.getText());
    }
    catch {
      return [];
    }
  }

  private async saveWebResourceMetadata(metadata: IWebResource[]) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
    const file = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), '.vscode', 'cds-webresources.json');

    var buffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8');
    var array = new Uint8Array(buffer);
    await vscode.workspace.fs.writeFile(file, array);
  }

  private async getWebResourceDetails(resources: vscode.Uri[]): Promise<IWebResource[]> {
    const webResources = [];
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
    const webResourceFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.webresources.folder');
    const webResourceMeta = await this.getWebResourceMetadata();

    for (let resource of resources) {
      let webResource = webResourceMeta.find((file: IWebResource) => vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder || '', file.file).fsPath === resource.fsPath);

      if (!webResource) {
        webResource = {
          description: '',
          displayName: path.basename(resource.fsPath),
          uniqueName: resource.path.replace(vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder || '').path + '/' || '', ''),
          file: resource.fsPath.replace(vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder || '').fsPath + '\\' || '', '')
        };

        webResources.push(webResource);
        webResourceMeta.push(webResource);

        this.saveWebResourceMetadata(webResourceMeta);
      }
      else {
        webResources.push(webResource);
      }
    }

    return webResources;
  }

  private async setWebResourceDetails(resources: IWebResource[]): Promise<void> {
    const webResourceMeta = await this.getWebResourceMetadata();

    for (let resource of resources) {
      const index = webResourceMeta.findIndex((file: IWebResource) => file.file === resource.file);

      if (index > -1) {
        webResourceMeta.splice(index, 1, resource);
      }
      else {
        webResourceMeta.push(resource);
      }
    }

    this.saveWebResourceMetadata(webResourceMeta);
  }

  private async downloadAndMapWebResources(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const webResourceFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.webresources.folder');
      const webResourceMeta = await this.getWebResourceMetadata();
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
            uniqueName: resource.name
          });
        }
      });

      this.setWebResourceDetails(webResources);
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

        this.createOrUpdateWebResource(webResources[0]);
      }
    });
  }

  private async deployAllWebResources() {
    const webResourceMeta = await this.getWebResourceMetadata();

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

        this.createOrUpdateWebResource(webResource);
      }
    });
  }

  private async createOrUpdateWebResource(webResource: IWebResource) {
    try {
      const resources = await WebApi.retrieveMultiple(
        'webresourceset',
        ['webresourceid'],
        `name eq '${webResource.uniqueName}'`,
        1
      );

      let webResourceType = WebResourceTypes.None;

      switch (path.extname(webResource.file)) {
        case '.css':
          webResourceType = WebResourceTypes.CSS;
          break;
        case '.gif':
          webResourceType = WebResourceTypes.GIF;
          break;
        case '.html':
        case '.htm':
          webResourceType = WebResourceTypes.HTML;
          break;
        case '.ico':
          webResourceType = WebResourceTypes.ICO;
          break;
        case '.jpg':
        case '.jpeg':
          webResourceType = WebResourceTypes.JPG;
          break;
        case '.js':
          webResourceType = WebResourceTypes.JScript;
          break;
        case '.png':
          webResourceType = WebResourceTypes.PNG;
          break;
        case '.resx':
          webResourceType = WebResourceTypes.RESX;
          break;
        case '.svg':
          webResourceType = WebResourceTypes.SVG;
          break;
        case '.xap':
          webResourceType = WebResourceTypes.XAP;
          break;
        case '.xml':
          webResourceType = WebResourceTypes.XML;
          break;
        case '.xsl':
          webResourceType = WebResourceTypes.XSL;
          break;
        default:
          webResourceType = WebResourceTypes.None;
          break;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const webResourceFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.webresources.folder');

      const file = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder || '', webResource.file);
      const document = await vscode.workspace.openTextDocument(file.path);
      const content = Buffer.from(document.getText()).toString('base64');

      if (resources.length > 0) {
        await WebApi.patch(`webresourceset(${resources[0].webresourceid})`, {
          name: webResource.uniqueName,
          displayname: webResource.displayName,
          description: webResource.description,
          webresourcetype: webResourceType,
          content: content
        });
      }
      else {
        const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

        const response = await WebApi.post(`webresourceset`, {
          name: webResource.uniqueName,
          displayname: webResource.displayName,
          description: webResource.description,
          webresourcetype: webResourceType,
          solutionid: solution?.solutionId,
          content: content
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