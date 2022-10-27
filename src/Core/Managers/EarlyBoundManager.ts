import * as vscode from 'vscode';
import * as jwt_decode from 'jwt-decode';
import * as child_process from 'child_process';
import * as xml2js from 'xml2js';
import * as Constants from '../Constants/Constants';
import { EarlyboundActions } from '../Enums/EarlyboundActions';
import IOrganization from '../../Entities/IOrganization';
import { AuthProviderType } from '../Enums/AuthProviderType';

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
    let configPath = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.earlybound').get<string>('generatorSettings');

    if (configPath) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const configFile = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), configPath);
      const array = await vscode.workspace.fs.readFile(configFile);
      const buffer = Buffer.from(array);
      const config = await xml2js.parseStringPromise(buffer.toString());

      let optionSetArgs = config.Config.UserArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'OptionSets');
      let actionArgs = config.Config.UserArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'Actions');
      let entityArgs = config.Config.UserArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'Entities');
      let allArgs = config.Config.UserArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'All');

      optionSetArgs = optionSetArgs.concat(config.Config.ExtensionArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'OptionSets'));
      actionArgs = actionArgs.concat(config.Config.ExtensionArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'Actions'));
      entityArgs = entityArgs.concat(config.Config.ExtensionArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'Entities'));
      allArgs = allArgs.concat(config.Config.ExtensionArguments[0].Argument.filter((arg: any) => arg.SettingType[0] === 'All'));

      const actionParams = actionArgs.map((arg: any) => arg.Name[0] === 'out' ? `/${arg.Name[0]}:${vscode.Uri.joinPath(configFile, '..', arg.Value[0]).fsPath}` : `/${arg.Name[0]}:${arg.Value[0]}`);
      const entityParams = entityArgs.map((arg: any) => arg.Name[0] === 'out' ? `/${arg.Name[0]}:${vscode.Uri.joinPath(configFile, '..', arg.Value[0]).fsPath}` : `/${arg.Name[0]}:${arg.Value[0]}`);
      const optionSetParams = optionSetArgs.map((arg: any) => arg.Name[0] === 'out' ? `/${arg.Name[0]}:${vscode.Uri.joinPath(configFile, '..', arg.Value[0]).fsPath}` : `/${arg.Name[0]}:${arg.Value[0]}`);

      for (var arg of allArgs) {
        const param = `/${arg.Name[0]}:${arg.Value[0]}`;

        actionParams.unshift(param);
        entityParams.unshift(param);
        optionSetParams.unshift(param);
      }

      await this.injectSettings(config.Config.ExtensionConfig[0], actionParams, entityParams, optionSetParams);

      await this.executeCrmSvcUtils(EarlyboundActions.Entities, ...entityParams);
      await this.executeCrmSvcUtils(EarlyboundActions.OptionSets, ...optionSetParams);

      if (actionArgs.find((arg: any) => arg.Name[0] === 'generateActions')?.Value[0]) {
        await this.executeCrmSvcUtils(EarlyboundActions.Actions, ...actionParams);
      }
    }
  }

  private async getConnection(): Promise<string> {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
    const token = jwt_decode.default<any>((await vscode.authentication.getSession(AuthProviderType.microsoft, [org?.url + '//user_impersonation']))?.accessToken || '');
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
        let value = config[setting][0];

        if (value instanceof Boolean) {
          value = value ? 'True' : 'False';
        }

        if (value instanceof Array) {
          value = value.map(v => v.trim()).join('|');
        }

        if (value && value.$ && value.$['xsi:nil']) {
          value = null;
        }

        while (value && value.toString().indexOf('\r') >= 0) {
          value = value.replace('\r', '');
        }

        while (value && value.toString().indexOf('\n') >= 0) {
          value = value.replace('\n', '');
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

  private async executeCrmSvcUtils(action: EarlyboundActions, ...params: string[]): Promise<void> {
    return new Promise(async (resolve, reject) => {

      const crmSvcUtils = this.context.workspaceState.get<vscode.Uri>('cha0s2nd-vscode-cds.dlabFile');

      if (crmSvcUtils) {
        let title = '';

        switch (action) {
          case EarlyboundActions.Actions:
            title = 'Cha0s Data Tools: Early-bound (Actions)';
            break;
          case EarlyboundActions.Entities:
            title = 'Cha0s Data Tools: Early-bound (Entities)';
            break;
          case EarlyboundActions.OptionSets:
            title = 'Cha0s Data Tools: Early-bound (OptionSets)';
            break;
        }

        const output = vscode.window.createOutputChannel(title);
        output.show();

        params.unshift(`/connectionstring:${await this.getConnection()}`);

        const process = child_process.spawn(crmSvcUtils.fsPath, params);

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
            output.append(`CrmSvcUtil exited with code '${code}'`);
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