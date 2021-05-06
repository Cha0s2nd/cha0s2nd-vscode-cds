import { AttributeTypes } from "../Core/Enums/AttributeTypes";
import IDisplayName from "./IDisplayName";

export default interface IAttribute {
  MetadataId: string,
  EntityLogicalName: string,
  IsPrimaryId: boolean,
  IsPrimaryName: boolean,
  LogicalName: string,
  SchemaName: string,
  AttributeType: AttributeTypes,
  Description: IDisplayName,
  DisplayName: IDisplayName
}