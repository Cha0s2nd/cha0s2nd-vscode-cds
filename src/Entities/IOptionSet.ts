import { AttributeTypes } from "../Core/Enums/AttributeTypes";
import IDisplayName from "./IDisplayName";
import IOption from "./IOption";

export default interface IOptionSet {
  MetadataId: string,
  Name: string,
  OptionSetType: AttributeTypes,
  ParentOptionSetName?: string,
  Description: IDisplayName,
  DisplayName: IDisplayName,
  Options: IOption[]
}