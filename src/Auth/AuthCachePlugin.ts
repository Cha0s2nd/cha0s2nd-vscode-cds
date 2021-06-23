import * as vscode from 'vscode';
import * as msal from "@azure/msal-node";
import * as fs from "fs";

export default class AuthCachePlugin implements msal.ICachePlugin {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async beforeCacheAccess(tokenCacheContext: msal.TokenCacheContext): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        if (fs.existsSync(this.context.asAbsolutePath('auth_cache'))) {
          fs.readFile(this.context.asAbsolutePath('auth_cache'), { encoding: "utf-8" }, (err: NodeJS.ErrnoException | null, data: string) => {
            if (!err) {
              tokenCacheContext.tokenCache.deserialize(data);
              resolve();
            }
            else {
              reject(err);
            }
          });
        }
        else {
          resolve();
        }
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async afterCacheAccess(tokenCacheContext: msal.TokenCacheContext): Promise<void> {
    if (tokenCacheContext.cacheHasChanged) {
      await new Promise<void>((resolve, reject) => {
        try {
          fs.writeFile(this.context.asAbsolutePath('auth_cache'), tokenCacheContext.tokenCache.serialize(), (err: NodeJS.ErrnoException | null) => {
            if (!err) {
              resolve();
            }
            else {
              reject(err);
            }
          });
        }
        catch (err) {
          reject(err);
        }
      });
    }
  }
}