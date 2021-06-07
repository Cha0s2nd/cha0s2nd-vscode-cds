import * as vscode from 'vscode';
import * as path from 'path';
import IWebResource from '../../Entities/IWebResource';
import ISolution from '../../Entities/ISolution';
import WebApi from '../Xrm/WebApi';
import { SolutionComponentTypes } from '../Enums/SolutionComponentTypes';
import { WebResourceTypes } from '../Enums/WebResourceTypes';
import ISpklSettings from '../../Entities/ISpklSettings';
import ISpklWebResource from '../../Entities/ISpklWebResource';

export default class WebResourceManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.getMetadata', async (resources: vscode.Uri[]) => { return this.getWebResourceMetadata(resources); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.setName', async (resource: vscode.Uri) => { return this.setWebResourceName(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.setDisplayName', async (resource: vscode.Uri) => { return this.setWebResourceDisplayName(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deploy', async (resource: vscode.Uri) => { return this.deployWebResource(resource); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deployAll', async () => { return this.deployAllWebResources(); }));
  }

  private async setWebResourceDisplayName(resource: vscode.Uri) {
    let metadata = await this.getWebResourceMetadata([resource]);

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
    let metadata = await this.getWebResourceMetadata([resource]);

    const name = await vscode.window.showInputBox({
      placeHolder: 'Unique Name',
      value: metadata[0].uniqueName
    });

    if (name !== undefined) {
      metadata[0].uniqueName = name;
      this.setWebResourceDetails(metadata);
    }
  }

  private async getAllWebResourceMetadata(): Promise<ISpklWebResource[]> {
    const settings = await vscode.commands.executeCommand<ISpklSettings>('cha0s2nd-vscode-cds.spkl.setting.get');
    return settings?.webresources || [];
  }

  private async saveWebResourceMetadata(metadata: ISpklWebResource[]) {
    const settings = await vscode.commands.executeCommand<ISpklSettings>('cha0s2nd-vscode-cds.spkl.setting.get');
    if (settings) {
      settings.webresources = metadata;
      await vscode.commands.executeCommand('cha0s2nd-vscode-cds.spkl.setting.update', settings);
    }
  }

  private async getWebResourceMetadata(resources: vscode.Uri[]): Promise<IWebResource[]> {
    const webResources = [];
    const webResourceMeta = await this.getAllWebResourceMetadata();

    for (let resource of resources) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const file = resource.fsPath.replace(workspaceFolder?.uri.fsPath + '\\' || '\\', '');
      const webResourceFolder = webResourceMeta.find((resourceFolder: ISpklWebResource) => file.startsWith('\\' + resourceFolder.root) || file.startsWith(resourceFolder.root));

      if (webResourceFolder) {
        let webResource = webResourceFolder.files.find(wr => wr.file === file.replace(webResourceFolder.root + '\\', ''));

        if (!webResource) {
          webResource = {
            displayName: path.basename(resource.fsPath),
            uniqueName: resource.path.replace(vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder.root).path + '/', ''),
            file: file.replace(webResourceFolder.root + '\\', '')
          };

          webResources.push(webResource);
          webResourceFolder.files.push(webResource);

          this.saveWebResourceMetadata(webResourceMeta);
        }
        else if (webResource) {
          webResources.push(webResource);
        }
      }
    }

    return webResources;
  }

  private async mapResourcesToFiles(resources: IWebResource[]): Promise<vscode.Uri[]> {
    const webResourceMeta = await this.getAllWebResourceMetadata();
    const files = new Array<vscode.Uri>();

    for (let resource of resources) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const webResourceFolder = webResourceMeta.find((resourceFolder: ISpklWebResource) => resourceFolder.files.find(file => file.file == resource.file));

      if (webResourceFolder) {
        files.push(vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), webResourceFolder?.root || '', resource.file));
      }
    }

    return files;
  }

  private async setWebResourceDetails(resources: IWebResource[]): Promise<void> {
    const webResourceMeta = await this.getAllWebResourceMetadata();

    for (let resource of resources) {
      const webResourceFolder = webResourceMeta.find((resourceFolder: ISpklWebResource) => resource.file.startsWith(resourceFolder.root));
      if (webResourceFolder) {
        const index = webResourceFolder.files.findIndex((file: IWebResource) => file.file === resource.file);

        if (index && index > -1) {
          webResourceFolder.files.splice(index, 1, resource);
        }
        else {
          webResourceFolder.files.push(resource);
        }
      }
    }

    this.saveWebResourceMetadata(webResourceMeta);
  }

  private async deployWebResource(resource: vscode.Uri) {
    const webResources = await this.getWebResourceMetadata([resource]);
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
    const webResourceMeta = await this.getAllWebResourceMetadata();

    let total = 0;
    for (let meta of webResourceMeta) {
      total += meta.files.length;
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true,
      title: "Deploying Web Resources..."
    }, async (progress, token) => {
      let count = 0;
      for (let folder of webResourceMeta) {
        for (let webResource of folder.files) {
          progress.report({
            message: `Uploading ${webResource.displayName}`,
            increment: count += 100 / total
          });

          this.createOrUpdateWebResource(webResource);
        }
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

      const files = await this.mapResourcesToFiles([webResource]);
      const array = await vscode.workspace.fs.readFile(files[0]);
      const content = Buffer.from(array).toString('base64');

      let response = null;

      if (resources.length > 0) {
        response = await WebApi.patch(`webresourceset(${resources[0].webresourceid})`, {
          name: webResource.uniqueName,
          displayname: webResource.displayName,
          webresourcetype: webResourceType,
          content: content
        });
      }
      else {
        const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

        response = await WebApi.post('webresourceset', {
          name: webResource.uniqueName,
          displayname: webResource.displayName,
          webresourcetype: webResourceType,
          solutionid: solution?.solutionId,
          content: content
        });

        if (response) {
          await WebApi.post('AddSolutionComponent', {
            ComponentId: response.webresourceid,
            ComponentType: SolutionComponentTypes.WebResource,
            SolutionUniqueName: solution?.uniqueName,
            AddRequiredComponents: false,
            DoNotIncludeSubcomponents: false,
            IncludedComponentSettingsValues: null
          });
        }
      }

      await WebApi.post('PublishXml', {
        ParameterXml: `<importexportxml><webresources><webresource>{${response.webresourceid}}</webresource></webresources></importexportxml>`
      });
    }
    catch (error) {
      vscode.window.showErrorMessage("Failed to deploy " + webResource.displayName + ": " + error);
    }
  }
}