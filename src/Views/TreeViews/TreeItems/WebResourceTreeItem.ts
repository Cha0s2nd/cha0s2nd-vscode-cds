import * as vscode from 'vscode';
import * as path from 'path';
import * as Constants from '../../../Core/Constants/Constants';
import IWebResource from '../../../Entities/IWebResource';
import IOrganization from '../../../Entities/IOrganization';
import ISolution from '../../../Entities/ISolution';

export default class WebResourceTreeItem extends vscode.TreeItem {
  public name: string;

  constructor(public webResource: IWebResource, private organization?: IOrganization, private solution?: ISolution) {
    super(webResource.displayname);

    this.contextValue = 'webResource';
    this.name = webResource.name;
    this.tooltip = webResource.displayname || '';

    this.iconPath = {
      light: path.join(__filename, "../../media/light/webresource.png"),
      dark: path.join(__filename, "../../media/dark/webresource.png")
    };

    if (organization && solution) {
      this.resourceUri = vscode.Uri.parse(`${Constants.POWERAPP_URL}/environments/${organization.environmentId}/solutions/${solution.solutionId}/objects/web resources`);
    }
  }
}