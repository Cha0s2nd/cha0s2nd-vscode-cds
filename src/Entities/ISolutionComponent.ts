import ISolution from "./ISolution";

export default interface ISolutionComponent {
  rootcomponentbehavior: number,
  solutionid: ISolution,
  ismetadata: boolean,
  componenttype: number,
  createdby: string,
  modifiedon: Date,
  solutioncomponentid: string,
  modifiedby: string,
  versionnumber: number,
  createdon: Date,
  objectid: string,
  rootsolutioncomponentid: string
}