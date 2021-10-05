using System;
using System.Collections.Generic;
using System.Linq;
using sdk_wrapper.Models;

namespace sdk_wrapper.Managers
{
  public sealed class ArgumentManager
  {
    public static Arguments ParseArguments(string[] args)
    {
      var arguments = new Arguments();
      var additionalArgs = new List<string>();

      args = args.Select(a => a.Trim('"')).ToArray();

      arguments.Action = args[0].ToLowerInvariant();

      for (int i = 1; i < args.Length; i++)
      {
        switch (args[i].ToLowerInvariant())
        {
          case "-s":
          case "-solution":
            arguments.Solution = args[i + 1];
            break;

          case "-c":
          case "-connectionstring":
            arguments.ConnectionString = args[i + 1];
            break;

          case "-u":
          case "-username":
            arguments.Username = args[i + 1];
            break;

          case "-p":
          case "-password":
            arguments.Password = args[i + 1];
            break;

          case "-url":
            arguments.Url = new Uri(args[i + 1]);
            break;

          default:
            additionalArgs.Add(args[i]);
            break;
        }
      }

      arguments.AdditionalArgs = additionalArgs;

      return arguments;
    }
  }
}