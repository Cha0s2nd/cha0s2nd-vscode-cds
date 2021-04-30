using System;
using System.Linq;
using Microsoft.Xrm.Sdk;
using sdk_wrapper.Managers;

namespace sdk_wrapper
{
  class Program
  {
    static void Main(string[] args)
    {
      IOrganizationService service = null;

      string connectionString = null;
      string url = null;
      string userName = null;
      string password = null;

      for (int i = 0; i < args.Length; i++)
      {
        switch (args[i].ToLowerInvariant())
        {
          case "-c":
          case "-connectionstring":
            connectionString = args[i + 1];
            break;

          case "-u":
          case "-username":
            userName = args[i + 1];
            break;

          case "-p":
          case "-password":
            password = args[i + 1];
            break;

          case "-url":
            url = args[i + 1];
            break;
        }
      }

      if (!string.IsNullOrWhiteSpace(connectionString))
      {
        service = ServiceManager.CreateOrganizationService(connectionString);
      }
      else if (!string.IsNullOrWhiteSpace(url))
      {
        service = ServiceManager.CreateOrganizationService(url, userName, password);
      }

      switch (args[0].ToLowerInvariant())
      {
        case "pluginassembly":
          PluginManager.UpdatePlugins(service, args[1]);
          break;

        case "plugin":
          PluginManager.UpdatePlugins(service, args[1]);
          break;
      }
    }
  }
}
