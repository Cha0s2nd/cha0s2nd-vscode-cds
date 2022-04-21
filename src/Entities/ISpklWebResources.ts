import ISpklWebResource from "./ISpklWebResource";

export default interface ISpklWebResources {
  profile: string,
  root: string,
  solution: string,
  autodetect?: string,
  deleteaction?: string,
  files: ISpklWebResource[]
}