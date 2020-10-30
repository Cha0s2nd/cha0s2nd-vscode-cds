import { QuickPickItem } from "vscode";

export default interface ISolution extends QuickPickItem {
  uniqueName: string;
  friendlyName: string;
  solutionId: string;
  organizationId: string;
  organizationName: string;
  version: string;
}