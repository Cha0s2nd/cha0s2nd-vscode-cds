import { Uri } from 'vscode';
import { WebResourceTypes } from '../core/enums/WebResourceTypes';

export default interface ICRMWebResource {
  DisplayName: string;
  UniqueName: string;
  WebResourceType: WebResourceTypes;
  Description: string;
  SolutionId: string;
  ModifiedOn: Date;
  ModifiedOnLocal: Date;
  File: Uri;
}