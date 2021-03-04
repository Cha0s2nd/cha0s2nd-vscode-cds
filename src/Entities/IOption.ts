import IDisplayName from "./IDisplayName";

export default interface IOption {
    Value: number,
    Color: string,
    ParentValues: IOption[],
    MetadataId: string
    Label: IDisplayName,
    Description: IDisplayName
}