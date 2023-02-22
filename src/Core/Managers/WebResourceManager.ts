import * as vscode from 'vscode';
import * as path from 'path';
import ISolution from '../../Entities/ISolution';
import WebApi from '../Xrm/WebApi';
import { SolutionComponentTypes } from '../Enums/SolutionComponentTypes';
import { WebResourceTypes } from '../Enums/WebResourceTypes';
import ISpklSettings from '../../Entities/ISpklSettings';
import ISpklWebResources from '../../Entities/ISpklWebResources';
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
      value: metadata[0].displayname
    });

    if (name !== undefined) {
      metadata[0].displayname = name;
      this.setWebResourceDetails(metadata);
    }
  }

  private async setWebResourceName(resource: vscode.Uri) {
    let metadata = await this.getWebResourceMetadata([resource]);

    const name = await vscode.window.showInputBox({
      placeHolder: 'Unique Name',
      value: metadata[0].uniquename
    });

    if (name !== undefined) {
      metadata[0].uniquename = name;
      this.setWebResourceDetails(metadata);
    }
  }

  private async getWebResourceRoot(): Promise<vscode.Uri> {
    return vscode.Uri.joinPath(vscode.Uri.parse(await vscode.commands.executeCommand<string>('cha0s2nd-vscode-cds.spkl.setting.getPath') || ''), '..');
  }

  private async getAllWebResourceMetadata(): Promise<ISpklWebResources[]> {
    const settings = await vscode.commands.executeCommand<ISpklSettings>('cha0s2nd-vscode-cds.spkl.setting.get');
    return settings?.webresources || [];
  }

  private async saveWebResourceMetadata(metadata: ISpklWebResources[]) {
    const settings = await vscode.commands.executeCommand<ISpklSettings>('cha0s2nd-vscode-cds.spkl.setting.get');
    if (settings) {
      settings.webresources = metadata;
      await vscode.commands.executeCommand('cha0s2nd-vscode-cds.spkl.setting.update', settings);
    }
  }

  private async getWebResourceMetadata(resources: vscode.Uri[]): Promise<ISpklWebResource[]> {
    const webResources = [];
    const webResourceMeta = await this.getAllWebResourceMetadata();
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

    for (let resource of resources) {
      const root = await this.getWebResourceRoot();
      const webResourceFolder = webResourceMeta.find((resourceFolder: ISpklWebResources) => resource.fsPath.startsWith(vscode.Uri.joinPath(root, resourceFolder.root).fsPath));

      if (webResourceFolder) {
        let webResource = webResourceFolder.files.find(wr => wr.file === path.relative(vscode.Uri.joinPath(root, webResourceFolder.root).fsPath, resource.fsPath));

        if (!webResource) {

          let uniqueName = path.relative(vscode.Uri.joinPath(root, webResourceFolder.root).path, resource.path);
          while (uniqueName.indexOf('\\') >= 0) {
            uniqueName = uniqueName.replace('\\', '/');
          }

          webResource = {
            displayname: path.basename(resource.fsPath),
            uniquename: uniqueName,
            file: path.relative(vscode.Uri.joinPath(root, webResourceFolder.root).fsPath, resource.fsPath),
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

  private async mapResourcesToFiles(resources: ISpklWebResource[]): Promise<vscode.Uri[]> {
    const webResourceMeta = await this.getAllWebResourceMetadata();
    const files = new Array<vscode.Uri>();

    for (let resource of resources) {
      const root = await this.getWebResourceRoot();
      const webResourceFolder = webResourceMeta.find((resourceFolder: ISpklWebResources) => resourceFolder.files.find(file => file.file === resource.file));

      if (webResourceFolder) {
        files.push(vscode.Uri.joinPath(root, webResourceFolder.root, resource.file));
      }
    }

    return files;
  }

  private async setWebResourceDetails(resources: ISpklWebResource[]): Promise<void> {
    const webResourceMeta = await this.getAllWebResourceMetadata();

    for (let resource of resources) {
      const webResourceFolder = webResourceMeta.find((resourceFolder: ISpklWebResources) => resourceFolder.files.find(file => file.file === resource.file));
      if (webResourceFolder) {
        const index = webResourceFolder.files.findIndex((file: ISpklWebResource) => file.file === resource.file);

        if (index != null && index > -1) {
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
          message: `Uploading ${webResources[0].displayname}`,
        });

        await this.createOrUpdateWebResource(webResources[0]);
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
            message: `Uploading ${webResource.displayname}`,
            increment: count += 100 / total
          });

          await this.createOrUpdateWebResource(webResource);
        }
      }
    });
  }

  private async createOrUpdateWebResource(webResource: ISpklWebResource) {
    try {
      const resources = await new WebApi(this.context).retrieveMultiple(
        'webresourceset',
        ['webresourceid'],
        `name eq '${webResource.uniquename}'`,
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
        response = await new WebApi(this.context).patch(`webresourceset(${resources[0].webresourceid})`, {
          name: webResource.uniquename,
          displayname: webResource.displayname,
          webresourcetype: webResourceType,
          content: content
        });
      }
      else {
        const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');

        response = await new WebApi(this.context).post('webresourceset', {
          name: webResource.uniquename,
          displayname: webResource.displayname,
          webresourcetype: webResourceType,
          solutionid: solution?.solutionId,
          content: content
        });

        if (response) {
          await new WebApi(this.context).post('AddSolutionComponent', {
            ComponentId: response.webresourceid,
            ComponentType: SolutionComponentTypes.WebResource,
            SolutionUniqueName: solution?.uniqueName,
            AddRequiredComponents: false,
            DoNotIncludeSubcomponents: false,
            IncludedComponentSettingsValues: null
          });
        }
      }

      await new WebApi(this.context).post('PublishXml', {
        ParameterXml: `<importexportxml><webresources><webresource>{${response.webresourceid}}</webresource></webresources></importexportxml>`
      });
    }
    catch (error) {
      vscode.window.showErrorMessage("Failed to deploy " + webResource.displayname + ": " + error);
    }
  }
}