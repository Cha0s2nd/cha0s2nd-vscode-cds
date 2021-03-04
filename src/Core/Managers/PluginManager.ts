import * as vscode from 'vscode';
import IOrganization from "../../Entities/IOrganization";
import ISolution from '../../Entities/ISolution';
import WebApi from '../xrm/WebApi';

export default class SolutionManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public registerCommands(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.plugin.updateAssembly', async () => { return await this.updateAssembly(); }));
    }

    private async getAvailableAssemblies(): Promise<ISolution[]> {
        const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.plugin.getAllAssemblies');

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


    public updateAssembly(): void {

    }
}