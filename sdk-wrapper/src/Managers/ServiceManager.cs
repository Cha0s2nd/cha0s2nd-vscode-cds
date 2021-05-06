using System;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Tooling.Connector;

namespace sdk_wrapper.Managers
{
  public sealed class ServiceManager
  {
    public static CrmServiceClient CreateOrganizationService(string url, string userName, string password)
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

    public static CrmServiceClient CreateOrganizationService(string connectionString)
    {
      CrmServiceClient.MaxConnectionTimeout = TimeSpan.FromMinutes(5);

      var service = new CrmServiceClient(connectionString);
      service.Execute(new WhoAmIRequest());
      return service;
    }
  }
}