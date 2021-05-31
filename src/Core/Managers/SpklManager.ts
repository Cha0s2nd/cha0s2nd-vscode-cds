import * as vscode from "vscode";
import * as Constants from "../Constants/Constants";
import * as child_process from 'child_process';
import * as jwt_decode from "jwt-decode";
import IOrganization from "../../Entities/IOrganization";
import IAuthToken from "../../Entities/IAuthToken";
import ISpklSettings from "../../Entities/ISpklSettings";
import { SpklActions } from "../Enums/SpklActions";

export default class SpklManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.setting.change', this.pickSpklFile));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.deployAll', this.deployWebResources));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.download', this.downloadWebResources));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.webresource.get', this.getWebResources));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.assembly.deploy', this.deployAssemblies));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.plugin.instrument', this.instrumentPlugins));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.plugin.deploy', this.deployPlugins));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.workflow.deploy', this.deployWorkflows));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.import', this.importSolution));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.solution.export', this.exportSolution));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.earlybound.generate', this.generateEntities));
  }

  private async pickSpklFile(): Promise<void> {
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
          await vscode.workspace.getConfiguration().update('cha0s2nd-vscode-cds.spkl.settings', file);
        }

        resolve();

        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          resolve(undefined);
        }, 1000 * 30);
      });
    }
  }

  private async getSettings(): Promise<string | undefined> {
    let spklJson = await vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.spkl.settings');

    if (!spklJson) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const configFile = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), '.vscode', 'cds-spkl-config.json');

      spklJson = configFile.fsPath;
    }

    return spklJson;
  }

  private async getAssemblies(): Promise<vscode.Uri[] | undefined> {
    return await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Plugin Assembly',
      canSelectFiles: true,
      canSelectFolders: false
    });
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

  private async executeSpkl(action: SpklActions, ...params: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const spklJson = await this.getSettings();

      if (spklJson) {
        const spkl = this.context.workspaceState.get<vscode.Uri>('cha0s2nd-vscode-cds.spkl');

        if (spkl) {

          params.unshift(await this.getConnection());
          params.unshift(spklJson);
          params.unshift(action);

          let outData = '';

          const output = vscode.window.createOutputChannel("Cha0s Data Tools: Spkl");
          output.show();

          const process = child_process.spawn(spkl.fsPath, params, {
            cwd: vscode.Uri.joinPath(spkl, "..").fsPath,
          });

          process.stdout.on('data', async (data) => {
            outData += data.toString();
            output.append(data.toString());
          });

          process.stderr.on('data', async (data) => {
            outData += data.toString();
            output.append(data.toString());
          });

          process.addListener('exit', async (code) => {
            output.append(`Spkl exited with code '${code}'`);

            if (code === 0) {
              // output.dispose();
              resolve(outData);
            }
            else {
              reject();
            }
          });
        }
        else {
          throw new Error("Could not locate spkl.exe");
        }
      }
    });
  }

  private async downloadWebResources() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.downloadWebResources, ...params);
  }

  private async getWebResources() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.getWebResources, ...params);
  }

  private async deployWebResources() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.deployWebResources, ...params);
  }

  private async deployAssemblies() {
    const params = new Array<string>();
    params.push('\\e');

    this.executeSpkl(SpklActions.deployPlugins, ...params);
  }

  private async instrumentPlugins() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.instrument, ...params);
  }

  private async deployPlugins() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.deployPlugins, ...params);
  }

  private async deployWorkflows() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.deployWorkflows, ...params);
  }

  private async importSolution() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.importSolution, ...params);
  }

  private async exportSolution() {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.exportSolution, ...params);
  }

  private async generateEntities(spklJson: vscode.Uri | undefined) {
    const params = new Array<string>();

    this.executeSpkl(SpklActions.generateEntities);
  }
}