import * as vscode from 'vscode';
import * as rp from 'request-promise';
import * as child_process from 'child_process';
import IOrganization from "../../Entities/IOrganization";
import ISolution from '../../Entities/ISolution';
import IExtensionMetaData from '../../Entities/IExtensionMetaData';
import WebApi from '../xrm/WebApi';
import { fileURLToPath } from 'url';

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
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.export', async () => { return await this.exportSolution(); }));
  }

  private async getAvailableSolutions(): Promise<ISolution[]> {
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
          UniqueName: solution.uniquename,
          FriendlyName: solution.friendlyname,
          SolutionId: solution.solutionid,
          OrganizationId: solution['_organizationid_value'],
          OrganizationName: solution['_organizationid_value@OData.Community.Display.V1.FormattedValue'],
          Version: solution.version,
          label: solution.friendlyname,
          description: solution.uniquename,
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
      this.statusBarItem.text = solution.FriendlyName;
      this.statusBarItem.show();
    }
    else {
      this.statusBarItem.hide();
    }
  }

  private async exportSolution(): Promise<void> {
    const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');

    if (metaData?.Solution.ExportManaged) {
      const fileUri = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Downloading Managed Solution ..."
      }, (progress) => this.downloadSolution(true));

      if (fileUri) {
        this.extractSolution(true, fileUri);
      }
    }

    if (metaData?.Solution.ExportUnManaged) {
      const fileUri = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Downloading Unmanaged Solution ..."
      }, (progress) => this.downloadSolution(false));

      if (fileUri) {
        this.extractSolution(false, fileUri);
      }
    }
  }

  private async downloadSolution(isManaged: boolean): Promise<vscode.Uri | undefined> {
    const solution = await this.getSolution();

    if (solution) {
      const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');

      const response = await WebApi.post('ExportSolution',
        {
          SolutionName: solution.UniqueName,
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
        let version = solution.Version;

        while (version.indexOf('.') >= 0) {
          version = version.replace(".", "_");
        }

        const zipFileName = `${metaData?.Solution.ZipFolder}\\${solution.UniqueName}_${version}${isManaged ? '_managed' : ''}.zip`;
        const fileUri = vscode.Uri.joinPath(vscode.Uri.file(metaData?.Folder || ''), zipFileName);

        var buffer = Buffer.from(response.ExportSolutionFile, 'base64');
        var array = new Uint8Array(buffer);
        await vscode.workspace.fs.writeFile(fileUri, array);

        return fileUri;
      }
    }
  }

  private async extractSolution(isManaged: boolean, fileUri: vscode.Uri): Promise<void> {
    const solution = await this.getSolution();

    if (solution) {
      try {
        const metaData = await vscode.commands.executeCommand<IExtensionMetaData>('cha0s2nd-vscode-cds.metadata.get');

        const spFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(metaData?.CrmUtilFolder || '', '**/SolutionPackager.exe'));

        if (spFiles.length < 1) {
          throw new Error("No CrmSvcUtil.exe file found, please refine the CrmSvcUtilFolder setting.");
        }

        if (spFiles.length > 1) {
          throw new Error("Multiple CrmSvcUtil.exe files found, please refine the CrmSvcUtilFolder setting.");
        }

        for (let sp of spFiles) {
          const terminal = vscode.window.createTerminal("CDS Solution: Export");

          terminal.show();

          terminal.sendText([
            `${sp.fsPath}`,
            '/action:Extract',
            `/folder:"${vscode.Uri.joinPath(vscode.Uri.file(metaData?.Folder || ''), metaData?.Solution.Folder || '').fsPath}\\${solution.UniqueName}"`,
            `/zipfile:"${fileUri.fsPath}"`,
            '/allowWrite:Yes',
            '/allowDelete:Yes',
            '/clobber',
            '/errorlevel:Verbose',
            '/nologo'
          ].join(' '));
        }
      }
      catch (error) {
        vscode.window.showErrorMessage(error);
      }
    }
  }
}