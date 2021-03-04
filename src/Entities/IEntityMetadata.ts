import IAttribute from "./IAttribute";
import IDisplayName from "./IDisplayName";
import IRelationship from "./IRelationship";

export default interface IEntityMetadata {
    MetadataId: string,
    LogicalName: string,
    ObjectTypeCode: number,
    SchemaName: string,
    LogicalCollectionName: string,
    CollectionSchemaName: string,
    EntitySetName: string,
    Attributes?: IAttribute[],
    Description?: IDisplayName,
    DisplayCollectionName: IDisplayName,
    DisplayName?: IDisplayName,
    ManyToManyRelationships?: IRelationship[],
    ManyToOneRelationships?: IRelationship[],
    OneToManyRelationships?: IRelationship[]
}