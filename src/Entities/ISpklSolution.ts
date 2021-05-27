import ISpklMap from "./ISpklMap";

export default interface ISpklSolution {
  profile: string,
  solution_uniquename: string,
  packagepath: string,
  solutionpath: string,
  packagetype: string,
  increment_on_import: boolean,
  map: ISpklMap[]
}