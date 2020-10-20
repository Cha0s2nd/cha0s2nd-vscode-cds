import IWebResource from "./IWebResource";

export default interface IExtensionMetaData {
  Folder?: string,
  CrmUtilFolder: string,
  WebResources: {
    Folder: string,
    Files: IWebResource[]
  },
  Solution: {
    Folder: string,
    ZipFolder: string,
    ExportManaged: boolean,
    ExportUnManaged: boolean
  }
}