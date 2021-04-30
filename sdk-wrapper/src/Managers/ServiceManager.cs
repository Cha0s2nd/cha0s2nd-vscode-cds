using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Tooling.Connector;

namespace sdk_wrapper.Managers
{
  public sealed class ServiceManager
  {
    public static IOrganizationService CreateOrganizationService(string url, string userName, string password)
    {
      string connectionString = $@"
                                Url = {url};
                                AuthType = OAuth;
                                UserName = {userName};
                                Password = {password};
                                AppId = 8baff5d8-eb25-4ea5-bcf9-b667499e2226;
                                RedirectUri = app://8baff5d8-eb25-4ea5-bcf9-b667499e2226;
                                LoginPrompt=Auto;
                                RequireNewInstance = True";

      return CreateOrganizationService(connectionString);
    }

    public static IOrganizationService CreateOrganizationService(string connectionString)
    {
      return new CrmServiceClient(connectionString);
    }
  }
}