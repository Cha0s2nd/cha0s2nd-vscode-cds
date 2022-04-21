import * as vscode from "vscode";
import * as fs from "fs";
import ISolution from "../../Entities/ISolution";
import ISpklPlugin from "../../Entities/ISpklPlugin";
import ISpklSettings from "../../Entities/ISpklSettings";
import ISpklWebResources from "../../Entities/ISpklWebResources";

export default class SpklSettingManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerCommands(): void {
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.setting.get', async () => { return this.getSettingsFromFile(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.setting.getPath', async () => { return this.getSettingsFilePath(); }));
    this.context.subscriptions.push(vscode.commands.registerCommand('cha0s2nd-vscode-cds.spkl.setting.update', async (settings: ISpklSettings) => { return this.saveSettingsToFile(settings); }));
  }

  public registerEvents(): void {
    vscode.workspace.onDidChangeConfiguration(this.onSettingChange, this);
  }

  public async initializeSettings(): Promise<void> {
    let settings = await this.getSettingsFromFile();

    settings = await this.setSolution(settings);
    settings = await this.setWebResources(settings);
    settings = await this.setPlugins(settings);
    settings = await this.setWorkflows(settings);
    settings = await this.setEarlybounds(settings);

    await this.saveSettingsToFile(settings);
  }

  private async onSettingChange(event: vscode.ConfigurationChangeEvent) {
    if (event.affectsConfiguration('cha0s2nd-vscode-cds')) {
      let settings = await this.getSettingsFromFile();

      if (event.affectsConfiguration('cha0s2nd-vscode-cds.solution')) {
        settings = await this.setSolution(settings);
      }

      if (event.affectsConfiguration('cha0s2nd-vscode-cds.webresource')) {
        settings = await this.setWebResources(settings);
      }

      if (event.affectsConfiguration('cha0s2nd-vscode-cds.plugin')) {
        settings = await this.setPlugins(settings);
      }

      if (event.affectsConfiguration('cha0s2nd-vscode-cds.workflow')) {
        settings = await this.setWorkflows(settings);
      }

      if (event.affectsConfiguration('cha0s2nd-vscode-cds.earlybound')) {
        settings = await this.setEarlybounds(settings);
      }

      await this.saveSettingsToFile(settings);
    }
  }

  private isCustomFile(): boolean {
    const setting = vscode.workspace.getConfiguration().get('cha0s2nd-vscode-cds.spkl.settings');
    return setting !== '' && setting !== null && setting !== undefined;
  }

  private async getSettingsFilePath(): Promise<vscode.Uri> {
    let fileSetting = vscode.workspace.getConfiguration().get<string>('cha0s2nd-vscode-cds.spkl.settings');

    if (!fileSetting) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(wsf => wsf);
      const configFile = vscode.Uri.joinPath(workspaceFolder?.uri || vscode.Uri.parse(''), '.vscode', 'spkl.json');

      return configFile;
    }
    else {
      return vscode.Uri.file(fileSetting);
    }
  }

  private async getSettingsFromFile(): Promise<ISpklSettings> {
    const file = await this.getSettingsFilePath();

    if (fs.existsSync(file.fsPath)) {
      const document = await vscode.workspace.openTextDocument(file.path);
      return JSON.parse(document.getText());
    }

    return {
      earlyboundtypes: [],
      plugins: [],
      workflows: [],
      solutions: [],
      webresources: []
    };
  }

  private async saveSettingsToFile(settings: ISpklSettings): Promise<void> {
    const file = await this.getSettingsFilePath();
    var buffer = Buffer.from(JSON.stringify(settings, null, 2), 'utf-8');
    var array = new Uint8Array(buffer);
    await vscode.workspace.fs.writeFile(file, array);
  }

  private async setSolution(settings: ISpklSettings): Promise<ISpklSettings> {
    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
    const config = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.solution');

    settings.solutions = [];

    const folder = config.get<string>('folder') || '';
    const zipFile = config.get<string>('zipFile') || 'solution_{0}_{1}_{2}_{3}.zip';
    const exportType = config.get<string>('exportType') || 'unmanaged';
    const importType = config.get<string>('importType') || 'unmanaged';
    const versionIncrement = config.get<boolean>('versionIncrement') || false;

    const packageType = exportType === 'both' ? `both_${importType}_import` : importType;

    settings.solutions.push({
      profile: 'default',
      increment_on_import: versionIncrement,
      packagepath: (this.isCustomFile() ? '' : '..\\') + zipFile,
      packagetype: packageType,
      solutionpath: (this.isCustomFile() ? '' : '..\\') + folder,
      solution_uniquename: solution?.uniqueName || 'Default',
      map: []
    });

    return settings;
  }

  private async setWebResources(settings: ISpklSettings): Promise<ISpklSettings> {
    const changedWebResources = new Array<ISpklWebResources>();

    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
    const config = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.webresource');

    const folders = config.get<string[]>('folders') || ['Webresources\\'];
    const autodetect = config.get<boolean>('processAll') || false;
    const deleteAction = config.get<string>('deleteAction') || 'None';

    for (let folder of folders) {
      let webResource = settings.webresources?.find(wr => wr.root === (this.isCustomFile() ? '' : '..\\') + folder);

      webResource = {
        profile: 'default',
        root: (this.isCustomFile() ? '' : '..\\') + folder,
        autodetect: autodetect ? 'yes' : 'no',
        deleteaction: deleteAction === 'Remove from Solution' ? 'remove' : (deleteAction === 'Delete from System' ? 'delete' : 'no'),
        solution: solution?.uniqueName || 'Default',
        files: webResource?.files || []
      };

      changedWebResources.push(webResource);
    }

    settings.webresources = changedWebResources;

    return settings;
  }

  private async setPlugins(settings: ISpklSettings): Promise<ISpklSettings> {
    const changedPlugins = new Array<ISpklPlugin>();

    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
    const config = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.plugin');

    const assemblies = config.get<string[]>('assemblies') || [];

    for (let assembly of assemblies) {
      changedPlugins.push({
        profile: 'default',
        assemblypath: (this.isCustomFile() ? '' : '..\\') + assembly,
        solution: solution?.uniqueName || 'Default'
      });
    }

    settings.plugins = changedPlugins;

    return settings;
  }

  private async setWorkflows(settings: ISpklSettings): Promise<ISpklSettings> {
    const changedWorkflows = new Array<ISpklPlugin>();

    const solution = await vscode.commands.executeCommand<ISolution>('cha0s2nd-vscode-cds.solution.get');
    const config = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.workflow');

    const assemblies = config.get<string[]>('assemblies') || [];

    for (let assembly of assemblies) {
      changedWorkflows.push({
        profile: 'default',
        assemblypath: (this.isCustomFile() ? '' : '..\\') + assembly,
        solution: solution?.uniqueName || 'Default'
      });
    }

    settings.workflows = changedWorkflows;

    return settings;
  }

  private async setEarlybounds(settings: ISpklSettings): Promise<ISpklSettings> {
    const config = vscode.workspace.getConfiguration('cha0s2nd-vscode-cds.earlybound');

    const actions = config.get<string[]>('actions') || [];
    const entities = config.get<string[]>('entities') || [];
    const optionSetEnums = config.get<boolean>('optionSetEnums') || true;
    const globalOptionSetEnums = config.get<boolean>('globalOptionSetEnums') || false;
    const stateEnums = config.get<boolean>('stateEnums') || true;
    const oneFilePerType = config.get<boolean>('oneFilePerType') || false;
    const fileName = config.get<string>('fileName') || 'EarlyBoundTypes.cs';
    const namespace = config.get<string>('namespace') || 'Entities';
    const serviceContext = config.get<string>('serviceContext') || 'XrmSvc';

    settings.earlyboundtypes = [{
      actions: actions.join(','),
      entities: entities.join(','),
      generateOptionsetEnums: optionSetEnums,
      generateGlobalOptionsets: globalOptionSetEnums,
      generateStateEnums: stateEnums,
      oneTypePerFile: oneFilePerType,
      filename: (this.isCustomFile() ? '' : '..\\') + fileName,
      classNamespace: namespace,
      serviceContextName: serviceContext
    }];

    return settings;
  }
}