export default interface ISpklEarlyBoundType {
  entities: string,
  actions: string,
  generateOptionsetEnums: boolean,
  generateStateEnums: boolean,
  generateGlobalOptionsets: boolean,
  filename: string,
  oneTypePerFile: boolean,
  classNamespace: string,
  serviceContextName: string
}