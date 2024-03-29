import * as vscode from 'vscode';
import * as Constants from "../Constants/Constants";
import * as child_process from 'child_process';
import * as jwt_decode from "jwt-decode";
import IOrganization from '../../Entities/IOrganization';
import ISolution from '../../Entities/ISolution';
import { AuthProviderType } from '../Enums/AuthProviderType';
import SessionManager from './SessionManager';

export default class SolutionManager {
  private context: vscode.ExtensionContext;
  private sessionManager: SessionManager;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.sessionManager = new SessionManager(context);
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.plugin.assembly.file', async (solution?: ISolution) => { return await this.updateAssembly(solution); }));
  }

  private async getConnection(): Promise<string> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
    const token = jwt_decode.default<any>(await this.sessionManager.refreshSession() || '');
    return `AuthType=OAuth;Url=${org?.url};AppId=${Constants.CLIENT_ID};RedirectUri=${Constants.REDIRECT_URL};Username=${token.unique_name};TokenCacheStorePath=${this.context.asAbsolutePath('token_cache')}`;
  }

  public async updateAssembly(solution?: ISolution): Promise<void> {
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Plugin Assembly',
      canSelectFiles: true,
      canSelectFolders: false
    });

    if (fileUris && fileUris[0]) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: "Registering Assembly"
      }, (progress) => this.uploadAssembly(fileUris[0], solution));
    }
  }

  public async uploadAssembly(fileUri: vscode.Uri, solution?: ISolution): Promise<void> {
    try {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        throw new Error('Registering Plugin Assembly timed out.');
      }, 1000 * 60 * 15);

      if (!solution) {
        solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
      }

      await this.executeSDKWrapper(
        "pluginassembly",
        `\"${fileUri.fsPath}\"`,
        "-c",
        `\"${await this.getConnection()}\"`,
        "-s",
        `\"${solution?.uniqueName}\"`,
      );
    }
    catch (error: any) {
      vscode.window.showErrorMessage(error);
    }
  }

  private async executeSDKWrapper(...params: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {

      let outData = '';

      const output = vscode.window.createOutputChannel("Cha0s Data Tools: Plugin Registration");
      output.show();

      const process = child_process.spawn('.\\sdk-wrapper.exe', params, {
        cwd: this.context.asAbsolutePath("\\sdk-wrapper\\dist\\"),
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
        if (code === 0) {
          resolve(outData);
        }
        else {
          output.append(`Plugin Registration exited with code '${code}'`);
          reject();
        }
      });
    });
  }
}