import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as uuid from 'node-uuid';
import * as fs from 'fs';
import IOrganization from "../../Entities/IOrganization";
import ISolution from '../../Entities/ISolution';
import WebApi from '../Xrm/WebApi';
import { Buffer } from 'buffer';
import { parseStringPromise } from 'xml2js';
import ISpklSolution from '../../Entities/ISpklSolution';
import ISpklSettings from '../../Entities/ISpklSettings';

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
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.getDefault', async () => { return await this.getDefaultSolution(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.change', async () => { return await this.changeSolution(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.import', async () => { return await this.importSolution(); }));
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

  private async getDefaultSolution(): Promise<ISolution | undefined> {
    const solution = await WebApi.retrieveMultiple(
      'solutions', [
      '_organizationid_value',
      'uniquename',
      'friendlyname',
      'version'
    ],
      "uniquename eq 'Default'");

    return {
      uniqueName: solution[0].uniquename,
      friendlyName: solution[0].friendlyname,
      solutionId: solution[0].solutionid,
      organizationId: solution[0]['_organizationid_value'],
      organizationName: solution[0]['_organizationid_value@OData.Community.Display.V1.FormattedValue'],
      version: solution[0].version,
      label: solution[0].friendlyname,
      description: solution[0].uniquename,
      detail: solution[0].version,
      alwaysShow: true
    };
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

  private async getSolutionRoot(): Promise<vscode.Uri> {
    return vscode.Uri.joinPath(await vscode.commands.executeCommand<vscode.Uri>('cha0s2nd-vscode-cds.spkl.setting.getPath') || vscode.Uri.parse(''), '..');
  }

  private async getSolutionMetaData(): Promise<ISpklSolution | undefined> {
    const settings = await vscode.commands.executeCommand<ISpklSettings>('cha0s2nd-vscode-cds.spkl.setting.get');
    if (settings?.solutions && settings?.solutions.length > 0) {
      return settings.solutions[0];
    }
  }

  private async exportSolution(): Promise<void> {
    const exportType = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.solution').get<string>('exportType') || 'unmanaged';

    if (exportType === 'mananged' || exportType === 'both') {
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

    if (exportType === 'unmananged' || exportType === 'both') {
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
          let version = solution.version.split('.');

          const root = await this.getSolutionRoot();
          const solutionMetadata = await this.getSolutionMetaData();
          let solutionZipFileName = vscode.Uri.joinPath(root, solutionMetadata?.packagepath || '');
          solutionZipFileName = vscode.Uri.file(solutionZipFileName.fsPath.replace('{0}', version[0]).replace('{1}', version[1]).replace('{2}', version[2]).replace('{3}', version[3]));

          var buffer = Buffer.from(response.ExportSolutionFile, 'base64');
          var array = new Uint8Array(buffer);
          await vscode.workspace.fs.writeFile(solutionZipFileName, array);

          return solutionZipFileName;
        }
      }
      catch (error: any) {
        vscode.window.showErrorMessage(error);
      }
    }
  }

  private async extractSolution(isManaged: boolean, fileUri: vscode.Uri): Promise<void> {
    const solution = await this.getSolution();

    const root = await this.getSolutionRoot();
    const solutionMetadata = await this.getSolutionMetaData();
    const solutionFolder = vscode.Uri.joinPath(root, solutionMetadata?.solutionpath || '', solutionMetadata?.solution_uniquename || '');

    if (solution) {
      try {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
          title: "Extracting Solution..."
        }, async (progress) => {
          await this.executeSolutionPackager(
            '/action:Extract',
            `/folder:${vscode.Uri.joinPath(solutionFolder, isManaged ? 'managed' : 'unmanaged').fsPath}`,
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
      catch (error: any) {
        vscode.window.showErrorMessage(error);
      }
    }
  }

  private async importSolution(): Promise<void> {
    const importType = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.solution').get<string>('importType') || 'unmananged';
    const root = await this.getSolutionRoot();
    const solutionMetadata = await this.getSolutionMetaData();
    const solutionFolder = vscode.Uri.joinPath(root, solutionMetadata?.solutionpath || '', solutionMetadata?.solution_uniquename || '');

    const fileUri = await this.packSolution(importType === 'mamanged', solutionFolder);
    if (fileUri) {
      await this.uploadSolution(importType === 'mamanged', fileUri);
      await vscode.workspace.fs.delete(fileUri);
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
          }, 1000 * 60 * 60);

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
    catch (error: any) {
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
        const version = solutionData.ImportExportXml.SolutionManifest[0].Version[0].split('.');

        const root = await this.getSolutionRoot();
        const solutionMetadata = await this.getSolutionMetaData();
        let solutionZipFileName = vscode.Uri.joinPath(root, solutionMetadata?.packagepath || '');
        solutionZipFileName = vscode.Uri.file(solutionZipFileName.fsPath.replace('{0}', version[0]).replace('{1}', version[1]).replace('{2}', version[2]).replace('{3}', version[3]));

        await this.executeSolutionPackager(
          '/action:Pack',
          `/folder:${solutionFolder.fsPath}`,
          `/zipfile:${solutionZipFileName.fsPath}`,
          `/packagetype:${isManaged ? 'Managed' : 'Unmanaged'}`,
          '/errorlevel:Verbose',
          '/nologo'
        );

        return solutionZipFileName;
      });
    }
    catch (error: any) {
      vscode.window.showErrorMessage(error);
    }
  }

  private async executeSolutionPackager(...params: string[]): Promise<void> {
    return new Promise(async (resolve, reject) => {

      const sp = this.context.workspaceState.get<vscode.Uri>('cha0s2nd-vscode-cds.solutionPackagerFile');

      if (sp) {
        const output = vscode.window.createOutputChannel("Cha0s Data Tools: Solution");
        output.show();

        const process = child_process.spawn(sp.fsPath, params);

        process.stdout.on('data', async (data) => {
          output.append(data.toString());
        });

        process.stderr.on('data', async (data) => {
          output.append(data.toString());
        });

        process.addListener('exit', async (code) => {
          if (code === 0) {
            resolve();
          }
          else {
            output.append(`Solution Packager exited with code '${code}'`);
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