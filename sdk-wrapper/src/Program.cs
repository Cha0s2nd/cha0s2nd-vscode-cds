using System;
using System.Linq;
using Microsoft.Xrm.Tooling.Connector;
using sdk_wrapper.Managers;
using sdk_wrapper.Models;

namespace sdk_wrapper
{
  class Program
  {
    static void Main(string[] args)
    {
      Console.Out.WriteLine("Cha0s Data Tools - SDK Wrapper");
      Console.Out.WriteLine("==============================");

      try
      {
        CrmServiceClient service = null;
        Arguments arguments = ArgumentManager.ParseArguments(args);

        if (!string.IsNullOrWhiteSpace(arguments.ConnectionString))
        {
          service = ServiceManager.CreateOrganizationService(arguments.ConnectionString);
        }
        else if (arguments.Url != null)
        {
          service = ServiceManager.CreateOrganizationService(arguments.Url.ToString(), arguments.Username, arguments.Password);
        }

        switch (arguments.Action)
        {
          case "pluginassembly":
            Console.Out.WriteLine("Register Plugin Assembly");
            PluginManager.UpdateAssembly(service, arguments.Solution, arguments.AdditionalArgs.First());
            Console.Out.WriteLine("Completed Plugin Assembly Registration");
            break;


          default:
            Console.Out.WriteLine("Unrecognized command, exiting...");
            break;
        }
      }
      catch (Exception ex)
      {
        Console.Error.WriteLine(ex.ToString());
      }
    }
  }
}
