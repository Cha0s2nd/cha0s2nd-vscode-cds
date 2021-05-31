import * as vscode from 'vscode';
import * as jwt_decode from 'jwt-decode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as xml2js from 'xml2js';
import * as Constants from '../Constants/Constants';
import IOrganization from '../../Entities/IOrganization';
import IAuthToken from '../../Entities/IAuthToken';
import IDlaBArgument from '../../Entities/IDlaBArgument';

export default class EarlyBoundManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.earlybound.generate', async () => { return this.generateEarlybounds(); }));
  }

  private async generateEarlybounds() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
    const configPath = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.earlybound').get<string>('generatorSettings');

    if (configPath) {
      const array = await vscode.workspace.fs.readFile(vscode.Uri.parse(configPath));
      const buffer = Buffer.from(array);
      const config = await xml2js.parseStringPromise(buffer.toString());

      let optionSetArgs: IDlaBArgument[] = config.UserArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'OptionSets');
      let actionArgs: IDlaBArgument[] = config.UserArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'Actions');
      let entityArgs: IDlaBArgument[] = config.UserArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'Entities');
      let allArgs: IDlaBArgument[] = config.UserArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'All');

      optionSetArgs = optionSetArgs.concat(config.ExtensionArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'OptionSets'));
      actionArgs = actionArgs.concat(config.ExtensionArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'Actions'));
      entityArgs = entityArgs.concat(config.ExtensionArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'Entities'));
      allArgs = allArgs.concat(config.ExtensionArguments.filter((arg: IDlaBArgument) => arg.SettingType === 'All'));

      const actionParams = actionArgs.map(arg => arg.Name === 'out' ? path.join(configPath, '..', arg.Name) : `/${arg.Name}:${arg.Value}`);
      const entityParams = entityArgs.map(arg => arg.Name === 'out' ? path.join(configPath, '..', arg.Name) : `/${arg.Name}:${arg.Value}`);
      const optionSetParams = optionSetArgs.map(arg => arg.Name === 'out' ? path.join(configPath, '..', arg.Name) : `/${arg.Name}:${arg.Value}`);

      for (var arg of allArgs) {
        const param = `/${arg.Name}:${arg.Value}`;

        actionParams.unshift(param);
        entityParams.unshift(param);
        optionSetParams.unshift(param);
      }

      await this.injectSettings(config.ExtensionConfig, actionParams, entityParams, optionSetParams);

      await this.executeCrmSvcUtils(...entityParams);
      await this.executeCrmSvcUtils(...optionSetParams);

      if (actionArgs.find(arg => arg.Name === 'generateActions')?.Value) {
        await this.executeCrmSvcUtils(...actionParams);
      }
    }
  }

  private async getConnection(): Promise<string> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
    const token = jwt_decode<any>((await vscode.commands.executeCommand<IAuthToken>('cha0s2nd-vscode-cds.auth.organizationToken.get', org))?.access_token || '');
    return `AuthType=OAuth;Url=${org?.url};AppId=${Constants.CLIENT_ID};RedirectUri=${Constants.REDIRECT_URL};Username=${token.unique_name};TokenCacheStorePath=${vscode.Uri.joinPath(this.context.extensionUri, 'token_cache').fsPath}`;
  }

  private async injectSettings(config: any, actionParams: string[], entityParams: string[], optionSetParams: string[]) {
    const dlabFile = this.context.workspaceState.get<vscode.Uri>('cha0s2nd-vscode-cds.dlabFile');

    if (dlabFile) {
      const configFile = await vscode.Uri.joinPath(dlabFile, '..', 'CrmSvcUtil.exe.config');

      const array = await vscode.workspace.fs.readFile(configFile);
      const buffer = Buffer.from(array);

      const configXml = await xml2js.parseStringPromise(buffer.toString());
      configXml.configuration.appSettings = [{ add: [] }];

      // Actions don't generate without this
      configXml.configuration.appSettings[0].add.push({
        "$": {
          "key": "ActionCommandLineText",
          "value": `.\\CrmSvcUtils.exe ${actionParams.join(' ')}`
        }
      });

      configXml.configuration.appSettings[0].add.push({
        "$": {
          "key": "EntityCommandLineText",
          "value": `.\\CrmSvcUtils.exe ${entityParams.join(' ')}`
        }
      });

      configXml.configuration.appSettings[0].add.push({
        "$": {
          "key": "OptionSetCommandLineText",
          "value": `.\\CrmSvcUtils.exe ${optionSetParams.join(' ')}`
        }
      });

      for (let setting in config) {
        let value = config[setting];

        if (value instanceof Boolean) {
          value = value ? 'True' : 'False';
        }

        if (value instanceof Array) {
          value = value.join('|');
        }

        configXml.configuration.appSettings[0].add.push({
          "$": {
            "key": setting,
            "value": value
          }
        });
      }

      const builder = new xml2js.Builder();
      var xml = builder.buildObject(configXml);

      const newBuffer = Buffer.from(xml, 'utf-8');
      const newArray = new Uint8Array(newBuffer);
      vscode.workspace.fs.writeFile(configFile, newArray);
    }
  }

  private async executeCrmSvcUtils(...params: string[]): Promise<void> {
    return new Promise(async (resolve, reject) => {

      const crmSvcUtils = this.context.workspaceState.get<vscode.Uri>('cha0s2nd-vscode-cds.dlabFile');

      if (crmSvcUtils) {
        const output = vscode.window.createOutputChannel('Cha0s Data Tools: Early-bound');
        output.show();

        params.unshift(`/connectionstring:${await this.getConnection()}`);

        output.appendLine(`${crmSvcUtils} ${params.join(' ')}`);

        const process = child_process.spawn(crmSvcUtils.fsPath, params);

        process.stdout.on('data', async (data) => {
          output.append(data.toString());
        });

        process.stderr.on('data', async (data) => {
          output.append(data.toString());
        });

        process.addListener('exit', async (code) => {
          output.append(`CrmSvcUtil exited with code '${code}'`);

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