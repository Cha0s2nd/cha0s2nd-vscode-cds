import * as vscode from 'vscode';
import * as rp from 'request-promise';
import * as Constants from '../Constants/Constants';
import IOrganization from '../../Entities/IOrganization';
import { AuthProviderType } from '../Enums/AuthProviderType';

export default class WebApi {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async retrieve(entitySet: string, id: string, columnSet?: string[] | null, filter?: string | null, additionalQuery?: string | null) {
    const query: string[] = [];
    let url: string = entitySet + '(' + id + ')';

    if (columnSet && columnSet.length > 0) {
      query.push('$select=' + encodeURIComponent(columnSet.join(',')));
    }

    if (filter) {
      query.push('$filter=' + encodeURIComponent(filter));
    }

    if (additionalQuery) {
      query.push(additionalQuery);
    }

    if (query.length > 0) {
      url = url + "?" + query.join("&");
    }

    return this.get(url);
  }

  public async retrieveMultiple(entitySet: string, columnSet?: string[] | null, filter?: string | null, top?: number | null, additionalQuery?: string | null): Promise<any[]> {
    const query: string[] = [];
    let url: string = entitySet;

    if (columnSet && columnSet.length > 0) {
      query.push('$select=' + encodeURIComponent(columnSet.join(',')));
    }

    if (filter) {
      query.push('$filter=' + encodeURIComponent(filter));
    }

    if (top) {
      query.push('$top=' + encodeURIComponent(top.toString()));
    }

    if (additionalQuery) {
      query.push(additionalQuery);
    }

    if (query.length > 0) {
      url = url + "?" + query.join("&");
    }

    const response = await this.get(url);
    return response.value;
  }

  public async retrieveMultiplePaged(entitySet: string, columnSet?: string[] | null, filter?: string | null, top?: number | null, additionalQuery?: string | null): Promise<any[]> {
    const query: string[] = [];
    let url: string = entitySet;
    let entities: any[] = [];

    if (columnSet && columnSet.length > 0) {
      query.push('$select=' + encodeURIComponent(columnSet.join(',')));
    }

    if (filter) {
      query.push('$filter=' + encodeURIComponent(filter));
    }

    if (top) {
      query.push('$top=' + encodeURIComponent(top.toString()));
    }

    if (additionalQuery) {
      query.push(additionalQuery);
    }

    if (query.length > 0) {
      url = url + "?" + query.join("&");
    }

    let response = await this.get(url);
    entities = entities.concat(response.value);
    while (response['@odata.nextLink']) {
      response = await this.get([entitySet, response['@odata.nextLink'].substring(response['@odata.nextLink'].indexOf('?'))].join(""));
      entities = entities.concat(response.value);
    }

    return entities;
  }

  public async remove(entitySet: string, id: string) {
    const query: string[] = [];
    let url: string = entitySet + '(' + id + ')';

    if (query.length > 0) {
      url = url + "?" + query.join("&");
    }

    return this.delete(url);
  }

  public async create(entitySet: string, entity: any) {
    return this.post(entitySet, entity);
  }

  public async update(entitySet: string, entity: any) {
    return this.patch(entitySet, { entity });
  }

  public async get(url: string) {
    return this.request(url, 'GET', null);
  }

  public async patch(url: string, body: any) {
    return this.request(url, 'PATCH', body);
  }

  public async post(url: string, body: any) {
    return this.request(url, 'POST', body);
  }

  public async delete(url: string) {
    return this.request(url, 'DELETE', null);
  }

  public async request(url: string, method: string, body: any) {
    const org = await vscode.commands.executeCommand<IOrganization>('cha0s2nd-vscode-cds.organization.get');

    if (vscode.workspace.getConfiguration().get<boolean>('cha0s2nd-vscode-cds.auth.useLegacy')) {
      return rp(url, {
        baseUrl: (await vscode.authentication.getSession(AuthProviderType.crmonprem, ['openid'], { createIfNone: true })).id + '/api/data/v' + org!.version.substring(0, 3) + '/',
        jar: true,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Prefer': 'odata.include-annotations="*", return=representation',
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
        },
        json: true,
        method: method,
        body: body
      });
    }
    else {
      let authToken = await this.context.secrets.get("authToken");

      if(!authToken){
        authToken = (await vscode.authentication.getSession(AuthProviderType.microsoft, [
          `VSCODE_CLIENT_ID:${Constants.CLIENT_ID}`,
          'VSCODE_TENANT:common', 
          'offline_access',
          `${org!.url}//user_impersonation`
        ], { createIfNone: true })).accessToken;

        this.context.secrets.store("authToken", authToken);
      }

      return rp(url, {
        baseUrl: org!.url + '/api/data/v' + org!.version.substring(0, 3) + '/',
        jar: false,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Prefer': 'odata.include-annotations="*", return=representation',
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
          'Authorization': 'Bearer ' + authToken
        },
        json: true,
        method: method,
        body: body
      });
    }
  }
}