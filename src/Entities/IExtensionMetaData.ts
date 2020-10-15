import IWebResource from "./IWebResource";

export default interface IExtensionMetaData {
  Solution: string,
  WebResources: {
    Folder: string,
    Files: IWebResource[]
  }
}