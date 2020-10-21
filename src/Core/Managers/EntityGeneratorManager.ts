import * as vscode from "vscode";
import WebApi from "./../Xrm/WebApi";
import IEntity from "./../../Entities/IEntity";

export default class EntityGeneratorManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public registerCommands(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.entities.generate', async () => { this.generate("k3c_contracts"); }));
    }

    private async generate(entitySet: string) {
        const entity: IEntity = JSON.parse(await WebApi.get(entitySet));

        if (entity) {
            let optionSet = {};

            for(var option = 0; option < entity.OptionSet.Options.length; option ++){
                
            }
            

        }

    }
}