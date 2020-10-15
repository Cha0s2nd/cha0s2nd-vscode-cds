import { Uri } from 'vscode';
import { WebResourceTypes } from '../core/enums/WebResourceTypes';

export default interface IWebResource {
  DisplayName: string;
  UniqueName: string;
  WebResourceType: WebResourceTypes;
  Description: string;
  SolutionId: string;
  ModifiedOn: Date;
  ModifiedOnLocal: Date;
  File: string;
}