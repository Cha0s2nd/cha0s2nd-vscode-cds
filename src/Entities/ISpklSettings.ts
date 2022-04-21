import ISpklEarlyBoundType from "./ISpklEarlyBoundType";
import ISpklPlugin from "./ISpklPlugin";
import ISpklSolution from "./ISpklSolution";
import ISpklWebResource from "./ISpklWebResources";

export default interface ISpklSettings {
  webresources?: ISpklWebResource[],
  plugins?: ISpklPlugin[],
  workflows?: ISpklPlugin[],
  earlyboundtypes?: ISpklEarlyBoundType[],
  solutions?: ISpklSolution[]
}