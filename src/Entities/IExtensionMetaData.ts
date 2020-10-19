import IWebResource from "./IWebResource";

export default interface IExtensionMetaData {
  FileLocation?: string,
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