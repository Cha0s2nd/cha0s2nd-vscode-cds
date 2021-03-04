import { RelationshipTypes } from "../Core/Enums/RelationshipTypes";

export default interface IRelationship {
    MetadataId: string,
    SchemaName: string,
    RelationshipType: RelationshipTypes,
    // One to Many / Many to One
    ReferencedAttribute?: string,
    ReferencedEntity?: string,
    ReferencingAttribute?: string,
    ReferencingEntity?: string,
    ReferencedEntityNavigationPropertyName?: string,
    ReferencingEntityNavigationPropertyName?: string,
    // Many to Many
    Entity1LogicalName?: string,
    Entity2LogicalName?: string,
    IntersectEntityName?: string,
    Entity1IntersectAttribute?: string,
    Entity2IntersectAttribute?: string,
    Entity1NavigationPropertyName?: string,
    Entity2NavigationPropertyName?: string,
}