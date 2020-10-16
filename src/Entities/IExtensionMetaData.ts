import IWebResource from "./IWebResource";

export default interface IExtensionMetaData {
  FileLocation?: string,
  WebResources: {
    Folder: string,
    Files: IWebResource[]
  }
}