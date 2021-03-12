import { ComponentStates } from "../Core/Enums/ComponentStates";
import { ImageTypes } from "../Core/Enums/ImageTypes";

export default interface ISDKMessageProcessingStep {
  sdkmessageprocessingstepimageid: string;
  name: string;
  attributes: string;
  componentstate: ComponentStates;
  description: string;
  entityalias: string;
  imagetype: ImageTypes;
  solutionid: string;
};