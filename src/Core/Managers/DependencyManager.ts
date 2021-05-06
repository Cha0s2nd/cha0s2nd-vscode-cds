import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as xml2js from 'xml2js';

export default class DependencyManager {
    private output: vscode.OutputChannel;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.output = vscode.window.createOutputChannel('Cha0s Data Tools: Dependencies');
    }

    private async getPackageFolder(): Promise<vscode.Uri | undefined> {
        const result = child_process.execSync('dotnet nuget locals all --list', {
            cwd: vscode.Uri.joinPath(this.context.extensionUri, 'dotnet-dependencies').fsPath,
        }).toString();

        const path = /(?:global\-packages\:\s)([A-Za-z0-9\\\.\/\:]+)/.exec(result)?.find(r => r);

        if (path) {
            return vscode.Uri.file(path.replace('global-packages:', '').trim());
        }
    }

    private async getProjectData(): Promise<any> {
        const array = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.context.extensionUri, 'dotnet-dependencies\\dotnet-dependencies.csproj'));
        var buffer = Buffer.from(array);

        return await xml2js.parseStringPromise(buffer.toString());
    }

    private async getPackageVersion(packageName: string): Promise<any> {
        const project = await this.getProjectData();

        return project.Project.ItemGroup.find((p: any) => p.PackageReference.find((pr: any) => pr.$.Include === packageName)).PackageReference.find((pr: any) => pr.$.Include === packageName).$.Version;
    }

    public async checkAll() {
        const packageFolder = await this.getPackageFolder();

        if (packageFolder) {
            await this.checkForCrmSdkTools(packageFolder);
            await this.checkForCrmPluginRegTool(packageFolder);
            await this.checkForDlaB(packageFolder);
        }
    }

    public async checkForCrmSdkTools(packageFolder: vscode.Uri) {
        await this.executeDotNet(
            'add',
            'dotnet-dependencies.csproj',
            'package',
            'microsoft.crmsdk.coretools'
        );

        const version = await this.getPackageVersion('microsoft.crmsdk.coretools');

        const spFile = vscode.Uri.joinPath(packageFolder, 'microsoft.crmsdk.coretools', version, 'content\\bin\\coretools\\SolutionPackager.exe');
        this.context.workspaceState.update('cha0s2nd-vscode-cds.solutionPackagerFile', spFile.fsPath);

        const utilFile = vscode.Uri.joinPath(packageFolder, 'microsoft.crmsdk.coretools', version, 'content\\bin\\coretools\\CrmSvcUtil.exe');
        this.context.workspaceState.update('cha0s2nd-vscode-cds.crmSvcUtilFile', utilFile.fsPath);
    }

    public async checkForCrmPluginRegTool(packageFolder: vscode.Uri) {
        await this.executeDotNet(
            'add',
            'dotnet-dependencies.csproj',
            'package',
            'microsoft.crmsdk.xrmtooling.pluginregistrationtool'
        );

        const version = await this.getPackageVersion('microsoft.crmsdk.xrmtooling.pluginregistrationtool');

        const prFile = vscode.Uri.joinPath(packageFolder, 'microsoft.crmsdk.xrmtooling.pluginregistrationtool', version, 'tools\\PluginRegistration.exe');
        this.context.workspaceState.update('cha0s2nd-vscode-cds.pluginRegToolFile', prFile.fsPath);
    }

    public async checkForDlaB(packageFolder: vscode.Uri) {
        await this.executeDotNet(
            'add',
            'dotnet-dependencies.csproj',
            'package',
            'dlab.xrm.earlyboundgenerator.api'
        );

        const version = await this.getPackageVersion('dlab.xrm.earlyboundgenerator.api');

        const dlabFile = vscode.Uri.joinPath(packageFolder, 'dlab.xrm.earlyboundgenerator.api', version, 'content\\bin\\DLaB.EarlyBoundGenerator\\CrmSvcUtil.exe');
        this.context.workspaceState.update('cha0s2nd-vscode-cds.dlabFile', dlabFile.fsPath);
    }

    private async executeDotNet(...params: string[]): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const process = child_process.spawn('dotnet', params, {
                cwd: vscode.Uri.joinPath(this.context.extensionUri, 'dotnet-dependencies').fsPath
            });

            process.stdout.on('data', async (data) => {
                this.output.append(data.toString());
            });

            process.stderr.on('data', async (data) => {
                this.output.append(data.toString());
            });

            process.addListener('exit', async (code) => {
                this.output.appendLine(`dotnet exited with code '${code}'`);

                if (code === 0) {
                    resolve();
                }
                else {
                    reject();
                }
            });
        });
    }
}