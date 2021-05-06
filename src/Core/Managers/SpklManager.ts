import * as vscode from "vscode";
import * as Constants from "../Constants/Constants";
import * as child_process from 'child_process';
import * as jwt_decode from "jwt-decode";
import IOrganization from "../../Entities/IOrganization";
import IAuthToken from "../../Entities/IAuthToken";
import { SpklActions } from "../Enums/SpklActions";

export default class SpklManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.webresources.deploy', async (spklJson: vscode.Uri | undefined) => { return this.deployWebResources(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.webresources.download', async (spklJson: vscode.Uri | undefined) => { return this.downloadWebResources(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.webresources.get', async (spklJson: vscode.Uri | undefined) => { return this.getWebResources(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.plugins.instrument', async (spklJson: vscode.Uri | undefined) => { return this.instrumentPlugins(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.plugins.deploy', async (spklJson: vscode.Uri | undefined) => { return this.deployPlugins(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.workflows.deploy', async (spklJson: vscode.Uri | undefined) => { return this.deployWorkflows(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.solution.import', async (spklJson: vscode.Uri | undefined) => { return this.importSolution(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.solution.export', async (spklJson: vscode.Uri | undefined) => { return this.exportSolution(spklJson); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.entities.generate', async (spklJson: vscode.Uri | undefined) => { return this.generateEntities(spklJson); }));
  }

  private async pickSpklFile(): Promise<vscode.Uri | undefined> {
    if (vscode.workspace.workspaceFolders) {
      let files: vscode.Uri[] = [];

      for (let workspaceFolder of vscode.workspace.workspaceFolders) {
        files = files.concat(await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri.path, '**/spkl.json')));
      }

      return new Promise(async (resolve, reject) => {
        const file = await vscode.window.showQuickPick(files.map(f => f.fsPath), {
          ignoreFocusOut: true,
          placeHolder: 'spkl.json'
        });

        if (file) {
          resolve(vscode.Uri.parse(file));
        }
        else {
          resolve(undefined);
        }

        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          resolve(undefined);
        }, 1000 * 30);
      });
    }
  }

  private async getParams(): Promise<string | undefined> {
    return new Promise<string | undefined>(async (resolve, reject) => {
      const params = await vscode.window.showInputBox({
        ignoreFocusOut: false,
        prompt: 'Please enter any additional spkl params if required',
        placeHolder: 'params'
      });

      resolve(params);

      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        resolve(undefined);
      }, 1000 * 30);
    });
  }

  private async getConnection(): Promise<string> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
    const token = jwt_decode.default<any>((await vscode.commands.executeCommand<IAuthToken>('cha0s2nd-vscode-cds.auth.organizationToken.get', org))?.access_token || '');
    return `AuthType=OAuth;Url=${org?.url};AppId=${Constants.CLIENT_ID};RedirectUri=${Constants.REDIRECT_URL};Username=${token.unique_name};TokenCacheStorePath=${this.context.asAbsolutePath('token_cache')}`;
  }

  private async getSpkl(): Promise<vscode.Uri | undefined> {
    let spkl: vscode.Uri | undefined;

    if (vscode.workspace.workspaceFolders) {
      for (let workspaceFolder of vscode.workspace.workspaceFolders) {
        return (await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri.path, '**/spkl.exe'))).shift();
      }
    }
  }

  private async executeSpkl(spklJson: vscode.Uri | undefined, action: SpklActions, ...params: string[]) {
    if (!spklJson) {
      spklJson = await this.pickSpklFile();
    }

    if (spklJson) {
      const spkl = await this.getSpkl();

      if (spkl) {
        const terminal = vscode.window.createTerminal('spkl');

        if (!vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.spkl').get<boolean>('useCachedConnections')) {
          params.unshift(await this.getConnection());
        }

        terminal.show();
        terminal.sendText(`cd "${vscode.Uri.joinPath(spkl, "..").fsPath}"`);
        terminal.sendText(`.\\spkl.exe ${action} "${spklJson.fsPath}" ${params.join(' ')}`, true);
      }
      else {
        throw new Error("Could not locate spkl.exe");
      }
    }
  }

  private async downloadWebResources(spklJson: vscode.Uri | undefined) {
    const params = await this.getParams() || '';

    this.executeSpkl(spklJson, SpklActions.downloadWebResources, params);
  }

  private async getWebResources(spklJson: vscode.Uri | undefined) {
    const params = await this.getParams() || '';

    this.executeSpkl(spklJson, SpklActions.getWebResources, params);
  }

  private async deployWebResources(spklJson: vscode.Uri | undefined) {
    const params = await this.getParams() || '';

    this.executeSpkl(spklJson, SpklActions.deployWebResources, params);
  }

  private async instrumentPlugins(spklJson: vscode.Uri | undefined) {
    this.executeSpkl(spklJson, SpklActions.instrument);
  }

  private async deployPlugins(spklJson: vscode.Uri | undefined) {
    const params = await this.getParams() || '';

    this.executeSpkl(spklJson, SpklActions.deployPlugins, params);
  }

  private async deployWorkflows(spklJson: vscode.Uri | undefined) {
    const params = await this.getParams() || '';

    this.executeSpkl(spklJson, SpklActions.deployWorkflows, params);
  }

  private async importSolution(spklJson: vscode.Uri | undefined) {
    const params = await this.getParams() || '';

    this.executeSpkl(spklJson, SpklActions.importSolution, params);
  }

  private async exportSolution(spklJson: vscode.Uri | undefined) {
    const params = await this.getParams() || '';

    this.executeSpkl(spklJson, SpklActions.exportSolution, params);
  }

  private async generateEntities(spklJson: vscode.Uri | undefined) {
    this.executeSpkl(spklJson, SpklActions.generateEntities);
  }
}