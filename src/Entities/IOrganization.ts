import { QuickPickItem } from "vscode";

export default interface IOrganization extends QuickPickItem {
  id: string;
  environmentId: string;
  uniqueName: string;
  urlName: string;
  friendlyName: string;
  version: string;
  url: string;
  apiUrl: string;
  lastUpdated: Date;
};