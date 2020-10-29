import { WebResourceTypes } from '../core/enums/WebResourceTypes';

export default interface IWebResource {
  displayName: string;
  uniqueName: string;
  webResourceType: WebResourceTypes;
  description: string;
  file: string;
  content?: string;
}