import { ComponentStates } from "../Core/Enums/ComponentStates";

export default interface IPluginType {
  plugintypeid: string;
  name: string;
  componentstate: ComponentStates;
  culture: string;
  description: string;
  friendlyname: string;
  isworkflowactivity: boolean;
  publickeytoken: string;
  solutionid: string;
  typename: string;
  version: string;
  workflowactivitygroupname: string;
};