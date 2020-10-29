import * as vscode from 'vscode';
import * as child_process from 'child_process';

export default class DependancyManager {
    private context: vscode.ExtensionContext;
    private output: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        this.output = vscode.window.createOutputChannel("CDS Tools: Dependancies");
    }

    public async checkForCrmUtils() {
        const files = await vscode.workspace.findFiles('**/SolutionPackager.exe');

        if (files.length > 0) {
            for (let file of files) {
                this.context.globalState.get<string>('cha0s2nd-vscode-cds.crmUtilFolder', vscode.Uri.joinPath(file, '..').fsPath);
            }
        }
        else {
            // this.output.show();

            // const process = child_process.spawn('dotnet', [
            //     'add',
            //     'package',
            //     'microsoft.crmsdk.coretools'
            // ]);

            // process.stdout.on('data', async (data) => {
            //     this.output.appendLine(data.toString());
            // });

            // process.stderr.on('data', async (data) => {
            //     this.output.appendLine(data.toString());
            // });

            // process.addListener('exit', async (code) => {
            //     this.output.appendLine(`Solution Packager exited with code '${code}'`);
            // });
        }
    }
}