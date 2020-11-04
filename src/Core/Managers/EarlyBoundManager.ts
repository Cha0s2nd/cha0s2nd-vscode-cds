import * as vscode from 'vscode';
import * as jwt_decode from 'jwt-decode';
import * as path from 'path';
import * as Constants from '../Constants/Constants';
import IOrganization from '../../Entities/IOrganization';
import { IAuthToken } from '../../Entities';

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
        const config = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.earlybound');

        const namespace = `${config.get<string>('namespace') ? '/namespace:' + config.get<string>('namespace') : ''}`;
        const outFile = `/out:"${path.join(workspaceFolder?.uri.fsPath || '', config.get<string>('filename') || '')}"`;
        const generateActions = `/generateActions:${config.get<string>('generateActions')}`;

        await this.executeCrmSvcUtils(outFile, generateActions, namespace);
    }

    private async getConnection(): Promise<string> {
        const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');
        const token = jwt_decode<any>((await vscode.commands.executeCommand<IAuthToken>('cha0s2nd-vscode-cds.auth.organizationToken.get', org))?.access_token || '');
        return `AuthType=OAuth;Url=${org?.url};AppId=${Constants.CLIENT_ID};RedirectUri=${Constants.REDIRECT_URL};Username=${token.unique_name};TokenCacheStorePath=${vscode.Uri.joinPath(this.context.extensionUri, 'token_cache').fsPath}`;
    }

    private async getCrmSvcUtils(): Promise<vscode.Uri | undefined> {
        const utils = await vscode.workspace.findFiles(new vscode.RelativePattern(this.context.workspaceState.get<string>('cha0s2nd-vscode-cds.crmUtilFolder') || '', '**/CrmSvcUtil.exe'));


        if (utils.length < 1) {
            throw new Error("No CrmSvcUtil.exe file found, please ensure the required NuGet packages are installed.");
        }

        if (utils.length > 1) {
            throw new Error("Multiple CrmSvcUtil.exe files found, please ensure the required NuGet packages are installed correctly.");
        }

        for (let util of utils) {
            return util;
        }
    }

    private async executeCrmSvcUtils(...params: string[]) {
        const crmSvcUtils = await this.getCrmSvcUtils();

        if (crmSvcUtils) {
            const terminal = vscode.window.createTerminal('CrmSvcUtil');

            terminal.show();
            terminal.sendText(`cd "${vscode.Uri.joinPath(crmSvcUtils, "..").fsPath}"`);
            terminal.sendText(`.\\CrmSvcUtil.exe /connectionstring:"${await this.getConnection()}" ${params.join(' ')}`, true);
        }
        else {
            throw new Error("Could not locate CrmSvcUtil.exe");
        }
    }
}