import { ComponentStates } from "../Core/Enums/ComponentStates";
import { ExecutionModes } from "../Core/Enums/ExecutionModes";
import { ExecutionStages } from "../Core/Enums/ExecutionStages";
import { StateCodes } from "../Core/Enums/StateCodes";
import { StatusReasons } from "../Core/Enums/StatusReasons";

export default interface ISDKMessageProcessingStep {
  sdkmessageprocessingstepid: string;
  name: string;
  asyncautodelete: boolean;
  componentstate: ComponentStates;
  configuration: string;
  description: string;
  filteringattributes: boolean;
  mode: ExecutionModes;
  rank: string;
  solutionid: string;
  stage: ExecutionStages;
  statecode: StateCodes;
  statuscode: StatusReasons;
};