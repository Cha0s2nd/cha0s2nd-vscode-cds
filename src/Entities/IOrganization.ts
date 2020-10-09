import { QuickPickItem } from "vscode";

export default interface IOrganization extends QuickPickItem {
  Id: string;
  UniqueName: string;
  UrlName: string;
  FriendlyName: string;
  State: 0;
  Version: string;
  Url: string;
  ApiUrl: string;
  LastUpdated: Date;
};