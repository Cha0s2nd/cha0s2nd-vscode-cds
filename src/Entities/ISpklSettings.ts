import ISpklEarlyBoundType from "./ISpklEarlyBoundType";
import ISpklPlugin from "./ISpklPlugin";
import ISpklSolution from "./ISpklSolution";
import ISpklWebResource from "./ISpklWebResource";

export default interface ISpklSettings {
  webresources: ISpklWebResource[],
  plugins: ISpklPlugin[],
  earlyboundtypes: ISpklEarlyBoundType[],
  solutions: ISpklSolution[]
}