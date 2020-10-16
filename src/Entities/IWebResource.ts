import { Uri } from 'vscode';
import { WebResourceTypes } from '../core/enums/WebResourceTypes';

export default interface IWebResource {
  DisplayName: string;
  UniqueName: string;
  WebResourceType: WebResourceTypes;
  Description: string;
  File: string;
  Content?: string;
}