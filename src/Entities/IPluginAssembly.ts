import { ComponentStates } from "../Core/Enums/ComponentStates";
import { PluginSourceTypes } from "../Core/Enums/PluginSourceTypes";

export default interface IPluginAssembly {
  pluginassemblyid: string;
  name: string;
  componentstate: ComponentStates;
  content: string;
  culture: string;
  description: string;
  publickeytoken: string;
  solutionid: string;
  sourcetype: PluginSourceTypes;
  version: string;
};