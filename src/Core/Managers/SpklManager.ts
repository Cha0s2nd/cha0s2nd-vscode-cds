import * as vscode from "vscode";
import * as Constants from "../Constants/Constants";
import * as child_process from 'child_process';
import * as jwt_decode from "jwt-decode";
import * as path from "path";
import IOrganization from "../../Entities/IOrganization";
import { SpklActions } from "../Enums/SpklActions";
import ISpklSettings from "../../Entities/ISpklSettings";
import ISolution from "../../Entities/ISolution";
import { AuthProviderType } from "../Enums/AuthProviderType";

export default class SpklManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.setting.change', () => this.pickSpklFile()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.webresource.deployAll', () => this.deployWebResources()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.webresource.download', () => this.downloadWebResources()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.webresource.get', () => this.getWebResources()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.assembly.deploy', () => this.deployAssemblies()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.assembly.file', () => this.deployAssembly()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.plugin.instrument', () => this.instrumentPlugins()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.plugin.deploy', () => this.deployPlugins()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.workflow.deploy', () => this.deployWorkflows()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.solution.import', () => this.importSolution()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.solution.export', () => this.exportSolution()));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.earlybound.generate', () => this.generateEntities()));
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

  private async pickAssembly(): Promise<vscode.Uri | undefined> {
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Plugin Assembly',
      canSelectFiles: true,
      canSelectFolders: false
    });

    if (fileUris && fileUris.length > 0) {
      return fileUris[0];
    }
  }

  private async getConnection(): Promise<string> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
    const token = jwt_decode.default<any>((await vscode.authentication.getSession(AuthProviderType.crm, [org?.url + '//user_impersonation']))?.accessToken || '');
    return `AuthType=OAuth;Url=${org?.url};AppId=${Constants.CLIENT_ID};RedirectUri=${Constants.REDIRECT_URL};Username=${token.unique_name};TokenCacheStorePath=${this.context.asAbsolutePath('token_cache')}`;
  }

  private async executeSpklWithTempSettings(action: SpklActions, settings: ISpklSettings, ...params: string[]) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
    const tempFolder = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), '.vscode', 'temp');
    var buffer = Buffer.from(JSON.stringify(settings, null, 2), 'utf-8');
    var array = new Uint8Array(buffer);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(tempFolder, 'spkl.json'), array);

    return new Promise(async (resolve, reject) => {
      const spkl = this.context.workspaceState.get<vscode.Uri>('cha0s2nd-vscode-cds.spkl');

      if (spkl) {
        params.unshift(await this.getConnection());
        params.unshift(tempFolder.fsPath);
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

            vscode.workspace.fs.delete(tempFolder, { recursive: true, useTrash: false });
          }
          else {
            reject();
          }
        });
      }
      else {
        throw new Error("Could not locate spkl.exe");
      }
    });
  }

  private async executeSpkl(action: SpklActions, ...params: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const spklJson = await vscode.commands.executeCommand<vscode.Uri>('cha0s2nd-vscode-cds.spkl.setting.getPath');

      if (spklJson) {
        const spkl = this.context.workspaceState.get<vscode.Uri>('cha0s2nd-vscode-cds.spkl');

        if (spkl) {

          params.unshift(await this.getConnection());
          params.unshift(spklJson.fsPath);
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

  private async deployAssembly() {
    const assemblyFile = await this.pickAssembly();

    if (assemblyFile) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const tempFolder = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), '.vscode', 'temp');
      const fileName = path.basename(assemblyFile.fsPath);

      vscode.workspace.fs.copy(assemblyFile, vscode.Uri.joinPath(tempFolder, fileName));

      const settings: ISpklSettings = {
        plugins: [{
          assemblypath: fileName,
          solution: 'Default',
          profile: 'default'
        }]
      };

      const params = new Array<string>();
      params.push('/e');

      this.executeSpklWithTempSettings(SpklActions.deployPlugins, settings, ...params);
    }
  }

  private async deployAssemblies() {
    const params = new Array<string>();
    params.push('/e');

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
    await vscode.commands.executeCommand('cha0s2nd-vscode-cds.solution.import');

    // const params = new Array<string>();

    // this.executeSpkl(SpklActions.importSolution, ...params);
  }

  private async exportSolution() {
    await vscode.commands.executeCommand('cha0s2nd-vscode-cds.solution.export');

    // const params = new Array<string>();

    // this.executeSpkl(SpklActions.exportSolution, ...params);
  }

  private async generateEntities() {
    const params = new Array<string>();
    const useDlaB = await vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.earlybound').get<boolean>('useDLaBGenerator');

    if (useDlaB) {
      await vscode.commands.executeCommand('cha0s2nd-vscode-cds.earlybound.generate');
    }
    else {
      this.executeSpkl(SpklActions.generateEntities, ...params);
    }
  }
}