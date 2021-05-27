import * as vscode from "vscode";

export default class SpklSettingManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public registerEvents(): void {
    vscode.workspace.onDidChangeConfiguration(this.onSettingChange);
  }

  private async onSettingChange(e: vscode.ConfigurationChangeEvent) {

  }
}