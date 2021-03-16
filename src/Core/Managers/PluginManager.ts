import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as uuid from 'node-uuid';
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';
import { PluginSourceTypes } from '../Enums/PluginSourceTypes';
import { IsolationModes } from '../Enums/IsolationModes';

export default class SolutionManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.plugin.updateAssembly', async () => { return await this.updateAssembly(); }));
  }

  private async getAvailableAssemblies(): Promise<ISolution[]> {
    const response = await WebApi.retrieveMultiple(
      'pluginassemblies',
      [
        'createdon',
        'culture',
        'customizationlevel',
        'description',
        'isolationmode',
        'major',
        'minor',
        'modifiedon',
        'name',
        'pluginassemblyid',
        'publickeytoken',
        'version'
      ],
      'ishidden/Value eq false'
    );

    if (response) {
      return response.map((assembly: any) => {
        return assembly;
      });
    }

    return [];
  }

  public async updateAssembly(): Promise<void> {
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
      }, (progress) => this.uploadAssembly(fileUris[0]));
    }
  }

  public async uploadAssembly(fileUri: vscode.Uri): Promise<void> {
    try {
      const wait = setTimeout(() => {
        clearTimeout(wait);
        throw new Error('Registering Plugin Assembly timed out.');
      }, 1000 * 60 * 15);

      const pluginFullName = (await this.executePowershell(`[System.Reflection.Assembly]::ReflectionOnlyLoadFrom("${fileUri.fsPath}").GetName().FullName`)).split(',');
      const name = pluginFullName[0];
      const version = pluginFullName[1].replace('Version=', '').trim();
      const culture = pluginFullName[2].replace('Culture=', '').trim();
      const publicToken = pluginFullName[3].replace('PublicKeyToken=', '').trim();

      const content = await vscode.workspace.fs.readFile(fileUri);

      const response = await WebApi.retrieveMultiple('pluginassemblies', ['pluginassemblyid'], `name eq '${name}'`);

      if (response && response[0]) {
        await WebApi.update('pluginassemblies', {
          pluginassemblyid: response[0].pluginassemblyid,
          content: Buffer.from(content).toString('base64'),
          name: name,
          culture: culture,
          version: version,
          publickeytoken: publicToken,
          sourcetype: PluginSourceTypes.Database,
          isolationmode: IsolationModes.Sandbox
        });
      }
      else {
        await WebApi.create('pluginassemblies', {
          pluginassemblyid: uuid.v4(),
          content: Buffer.from(content).toString('base64'),
          name: name,
          culture: culture,
          version: version,
          publickeytoken: publicToken,
          sourcetype: PluginSourceTypes.Database,
          isolationmode: IsolationModes.Sandbox
        });
      }
    }
    catch (error) {
      vscode.window.showErrorMessage(error);
    }
  }

  private async executePluginRegistrationTool(...params: string[]): Promise<void> {
    return new Promise(async (resolve, reject) => {

      const sp = this.context.workspaceState.get<string>('cha0s2nd-vscode-cds.pluginRegToolFile');

      if (sp) {
        const output = vscode.window.createOutputChannel("Cha0s Data Tools: Plugin Registration");
        output.show();

        const process = child_process.spawn(sp, params);

        process.stdout.on('data', async (data) => {
          output.append(data.toString());
        });

        process.stderr.on('data', async (data) => {
          output.append(data.toString());
        });

        process.addListener('exit', async (code) => {
          output.append(`Plugin Registration exited with code '${code}'`);

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
        throw new Error('Could not locate PluginRegistration.exe');
      }
    });
  }

  private async executePowershell(...params: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {

      let outData = '';

      const output = vscode.window.createOutputChannel("Cha0s Data Tools: Plugin Registration");
      output.show();

      const process = child_process.spawn('powershell', params);

      process.stdout.on('data', async (data) => {
        outData += data.toString();
        output.append(data.toString());
      });

      process.stderr.on('data', async (data) => {
        outData += data.toString();
        output.append(data.toString());
      });

      process.addListener('exit', async (code) => {
        output.append(`Plugin Registration exited with code '${code}'`);

        if (code === 0) {
          output.dispose();
          resolve(outData);
        }
        else {
          reject();
        }
      });
    });
  }
}