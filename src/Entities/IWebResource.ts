import { WebResourceTypes } from "../Core/Enums/WebResourceTypes";

export default interface IWebResource {
  webresourceid?: string;
  displayname: string;
  name: string;
  solutionid?: string;
  webresourcetype?: WebResourceTypes;
}