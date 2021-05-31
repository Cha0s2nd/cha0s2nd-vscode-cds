import IWebResourceFile from "./IWebResource";

export default interface ISpklWebResource {
  profile: string,
  root: string,
  solution: string,
  autodetect?: string,
  deleteaction?: string,
  files: IWebResourceFile[]
}