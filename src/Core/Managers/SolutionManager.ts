import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as uuid from 'node-uuid';
import * as fs from 'fs';
import IOrganization from "../../Entities/IOrganization";
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';
import { Buffer } from 'buffer';
import { parseStringPromise } from 'xml2js';

export default class SolutionManager {
  private context: vscode.ExtensionContext;
  private statusBarItem: vscode.StatusBarItem;
  public availableSolutions: ISolution[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.statusBarItem.command = 'cha0s2nd-vscode-cds.solution.change';
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.get', async () => { return await this.getSolution(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.change', async () => { return await this.changeSolution(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.importManaged', async () => { return await this.importSolution(true); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.importUnmanaged', async () => { return await this.importSolution(false); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.export', async () => { return await this.exportSolution(); }));
  }

  public async getAvailableSolutions(): Promise<ISolution[]> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');

    const response = await WebApi.retrieveMultiple(
      'solutions',
      [
        '_organizationid_value',
        'uniquename',
        'friendlyname',
        'version'
      ],
      'ismanaged eq false and isvisible eq true'
    );

    if (response) {
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

    return [];
  }

  private async getSolution(): Promise<ISolution | undefined> {
    const solution = this.context.workspaceState.get<ISolution>('cha0s2nd-vscode-cds.solution') || await this.changeSolution();

    this.updateStatusBar(solution);

    return solution;
  }

  private async changeSolution(solution?: ISolution): Promise<ISolution | undefined> {
    if (solution === undefined) {
      solution = await vscode.window.showQuickPick<ISolution>(
        await this.getAvailableSolutions(), {
        ignoreFocusOut: true,
        canPickMany: false,
        placeHolder: 'Solution',
      });
    }

    this.updateStatusBar(solution);
    this.context.workspaceState.update('cha0s2nd-vscode-cds.solution', solution);
    return solution;
  }

  private updateStatusBar(solution?: ISolution): void {
    if (solution) {
      this.statusBarItem.text = solution.uniqueName;
      this.statusBarItem.show();
    }
    else {
      this.statusBarItem.hide();
    }
  }

  private async exportSolution(): Promise<void> {
    if (vscode.workspace.getConfiguration().get<boolean>('cha0s2nd-vscode-cds.solution.exportManaged')) {
      const fileUri = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Downloading Managed Solution ..."
      }, (progress) => this.downloadSolution(true));

      if (fileUri) {
        await this.extractSolution(true, fileUri);
        await vscode.workspace.fs.delete(fileUri);
      }
    }

    if (vscode.workspace.getConfiguration().get<boolean>('cha0s2nd-vscode-cds.solution.exportUnmanaged')) {
      const fileUri = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Downloading Unmanaged Solution ..."
      }, (progress) => this.downloadSolution(false));

      if (fileUri) {
        await this.extractSolution(false, fileUri);
        await vscode.workspace.fs.delete(fileUri);
      }
    }
  }

  private async downloadSolution(isManaged: boolean): Promise<vscode.Uri | undefined> {
    const solution = await this.getSolution();

    if (solution) {
      try {
        const response = await WebApi.post('ExportSolution',
          {
            SolutionName: solution.uniqueName,
            ExportAutoNumberingSettings: false,
            ExportCalendarSettings: false,
            ExportCustomizationSettings: false,
            ExportEmailTrackingSettings: false,
            ExportExternalApplications: false,
            ExportGeneralSettings: false,
            ExportIsvConfig: false,
            ExportMarketingSettings: false,
            ExportOutlookSynchronizationSettings: false,
            ExportRelationshipRoles: false,
            ExportSales: false,
            Managed: isManaged
          }
        );

        if (response) {
          let version = solution.version;

          while (version.indexOf('.') >= 0) {
            version = version.replace(".", "_");
          }

          const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
          const solutionZipFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.solution.zipFolder') || '';

          const zipFileName = `${solutionZipFolder}\\${solution.uniqueName}_${new Date().valueOf()}${isManaged ? '_managed' : ''}.zip`;
          const fileUri = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), zipFileName);

          var buffer = Buffer.from(response.ExportSolutionFile, 'base64');
          var array = new Uint8Array(buffer);
          await vscode.workspace.fs.writeFile(fileUri, array);

          return fileUri;
        }
      }
      catch (error) {
        vscode.window.showErrorMessage(error);
      }
    }
  }

  private async extractSolution(isManaged: boolean, fileUri: vscode.Uri): Promise<void> {
    const solution = await this.getSolution();

    const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
    const solutionFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.solution.folder') || '';

    if (solution) {
      try {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
          title: "Extracting Solution..."
        }, async (progress) => {
          await this.executeSolutionPackager(
            '/action:Extract',
            `/folder:${vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), solutionFolder || '', solution.uniqueName, isManaged ? 'managed' : 'unmanaged').fsPath}`,
            `/zipfile:${fileUri.fsPath}`,
            `/packagetype:${isManaged ? 'Managed' : 'Unmanaged'}`,
            '/allowWrite:Yes',
            '/allowDelete:Yes',
            '/clobber',
            '/errorlevel:Verbose',
            '/nologo'
          );
        });
      }
      catch (error) {
        vscode.window.showErrorMessage(error);
      }
    }
  }

  private async importSolution(isManaged: boolean): Promise<void> {
    const folderUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Solution Folder',
      canSelectFiles: false,
      canSelectFolders: true
    });

    if (folderUris && folderUris[0]) {
      const fileUri = await this.packSolution(isManaged, folderUris[0]);
      if (fileUri) {
        await this.uploadSolution(isManaged, fileUri);
        await vscode.workspace.fs.delete(fileUri);
      }
    }
  }

  private async uploadSolution(isManaged: boolean, fileUri: vscode.Uri): Promise<void> {
    try {
      const jobId = uuid.v4();
      const content = await vscode.workspace.fs.readFile(fileUri);

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Importing Solution"
      }, async (progress): Promise<void> => {
        return new Promise(async (resolve, reject) => {
          progress.report({
            message: 'Uploading Solution package...'
          });

          const wait = setTimeout(() => {
            clearTimeout(wait);
            reject('Importing Solution timed out.');
          }, 1000 * 60 * 15);

          WebApi.post('ImportSolution',
            {
              OverwriteUnmanagedCustomizations: true,
              PublishWorkflows: true,
              CustomizationFile: Buffer.from(content).toString('base64'),
              ImportJobId: jobId
            }
          );

          let prevProgress = 0;

          const interval = setInterval(async (jobId, progress) => {
            const job = await WebApi.retrieve(
              'importjobs',
              jobId,
              [
                'importjobid',
                'solutionid',
                'progress',
                'completedon',
                'data'
              ]
            );

            const increment = job.progress - prevProgress;
            prevProgress = job.progress;

            progress.report({
              message: 'Applying Changes...',
              increment: increment
            });

            if (job.completedon) {
              clearInterval(interval);

              const data = await parseStringPromise(job.data);

              switch (data.importexportxml.$.succeeded) {
                case 'success':
                  resolve();
                  break;
                case 'warning':
                  await vscode.window.showWarningMessage("The Solution Import succeeded with Warnings.", {
                    modal: true
                  });
                  resolve();
                  break;
                default:
                  if ("Yes" === await vscode.window.showErrorMessage("The Solution Import failed, would you like to save the result containing the details of the failure?", {
                    modal: true
                  }, "Yes", "No")) {
                    const saveLocation = await vscode.window.showSaveDialog({
                      title: 'Cha0s Data Tools: Solution Import Result',
                      filters: { 'Xml': ['xml'] }
                    });

                    if (saveLocation) {
                      var buffer = Buffer.from(job.data, 'utf-8');
                      var array = new Uint8Array(buffer);
                      await vscode.workspace.fs.writeFile(saveLocation, array);
                    }
                  }

                  reject('Importing Solution failed');
                  break;
              }
            }
          }, 1000 * 5, jobId, progress);
        });
      });
    }
    catch (error) {
      vscode.window.showErrorMessage(error);
    }
  }

  private async packSolution(isManaged: boolean, solutionFolder: vscode.Uri): Promise<vscode.Uri | undefined> {
    try {
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Packing Solution..."
      }, async (progress) => {
        if (!fs.existsSync(vscode.Uri.joinPath(solutionFolder, isManaged ? 'managed' : 'unmanaged').fsPath)) {

          if (!fs.existsSync(solutionFolder.fsPath)) {
            new Error('The selected folder does not exist');
          }
        }
        else {
          solutionFolder = vscode.Uri.joinPath(solutionFolder, isManaged ? 'managed' : 'unmanaged');
        }

        const solutionFile = vscode.Uri.joinPath(solutionFolder, 'Other', 'Solution.xml');
        const array = await vscode.workspace.fs.readFile(solutionFile);
        const solutionData = await parseStringPromise(array.toString());

        const solutionName = solutionData.ImportExportXml.SolutionManifest[0].UniqueName;
        const solutionVersion = solutionData.ImportExportXml.SolutionManifest[0].Version;

        const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
        const solutionZipFolder = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.solution.zipFolder') || '';

        const zipFileName = `${solutionZipFolder}\\${solutionName}_${solutionVersion}${isManaged ? '_managed' : ''}.zip`;
        const fileUri = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), zipFileName);

        await this.executeSolutionPackager(
          '/action:Pack',
          `/folder:${solutionFolder.fsPath}`,
          `/zipfile:${fileUri.fsPath}`,
          `/packagetype:${isManaged ? 'Managed' : 'Unmanaged'}`,
          '/errorlevel:Verbose',
          '/nologo'
        );

        return fileUri;
      });
    }
    catch (error) {
      vscode.window.showErrorMessage(error);
    }
  }

  private async executeSolutionPackager(...params: string[]): Promise<void> {
    return new Promise(async (resolve, reject) => {

      const sp = this.context.workspaceState.get<string>('cha0s2nd-vscode-cds.solutionPackagerFile');

      if (sp) {
        const output = vscode.window.createOutputChannel("Cha0s Data Tools: Solution");
        output.show();

        const process = child_process.spawn(sp, params);

        process.stdout.on('data', async (data) => {
          output.append(data.toString());
        });

        process.stderr.on('data', async (data) => {
          output.append(data.toString());
        });

        process.addListener('exit', async (code) => {
          output.append(`Solution Packager exited with code '${code}'`);

          if (code === 0) {
            output.dispose();
            resolve();
          }
          else {
            reject();
          }
        });
      }
      else {
        throw new Error('Could not locate CrmSvcUtil.exe');
      }
    });
  }
}