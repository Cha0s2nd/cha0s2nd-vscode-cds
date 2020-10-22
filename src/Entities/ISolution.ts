import { QuickPickItem } from "vscode";

export default interface ISolution extends QuickPickItem {
  UniqueName: string;
  FriendlyName: string;
  SolutionId: string;
  OrganizationId: string;
  OrganizationName: string;
  Version: string;
}