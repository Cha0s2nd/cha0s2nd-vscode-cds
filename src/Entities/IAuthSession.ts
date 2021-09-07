import * as vscode from "vscode";
import * as msal from "@azure/msal-node";

export default interface IAuthSession {
  result?: any,
  session: vscode.AuthenticationSession
}