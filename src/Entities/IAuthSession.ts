import * as vscode from "vscode";
import * as msal from "@azure/msal-node";

export default interface IAuthSession {
  result: msal.AuthenticationResult | null,
  session: vscode.AuthenticationSession
}