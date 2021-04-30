using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace sdk_wrapper.Managers
{
  public sealed class PluginManager
  {
    public static void UpdateAssembly(IOrganizationService service, string filePath)
    {
      var assemblyFile = Assembly.LoadFrom(filePath);
      var pluginFullName = assemblyFile.FullName.Split(',');
      var name = pluginFullName[0];
      var version = pluginFullName[1].Replace("Version=", "").Trim();
      var culture = pluginFullName[2].Replace("Culture=", "").Trim();
      var publicToken = pluginFullName[3].Replace("PublicKeyToken=", "").Trim();

      var assembly = new Entity("pluginassembly");
      var assemblyId = Guid.Empty;

      assembly["name"] = name;
      assembly["culture"] = culture;
      assembly["version"] = version;
      assembly["publickeytoken"] = publicToken;
      assembly["sourcetype"] = 0;
      assembly["isolationmode"] = 2;
      assembly["content"] = Convert.ToBase64String(File.ReadAllBytes(filePath));

      var existingAssemblies = service.RetrieveMultiple(new QueryExpression
      {
        EntityName = "pluginassembly",
        ColumnSet = new ColumnSet("pluginassemblyid"),
        Criteria = new FilterExpression
        {
          Conditions = {
            new ConditionExpression("name", ConditionOperator.Equal, name)
          }
        }
      }).Entities;

      if (existingAssemblies.Count == 0)
      {
        assemblyId = service.Create(assembly);
      }
      else if (existingAssemblies.Count == 1)
      {
        assembly["pluginassemblyid"] = assemblyId = existingAssemblies.First().Id;

        service.Update(assembly);
      }
      else
      {
        throw new Exception($"Multiple plugin assemblies found for \"{name}\", cannot determine update target.");
      }

      UpdatePlugins(service, assemblyFile, assemblyId);
    }

    public static void UpdatePlugins(IOrganizationService service, Assembly assembly, Guid assemblyId)
    {
      var pluginTypes = assembly.GetExportedTypes().Where(p => p.GetInterfaces().FirstOrDefault(i => i.Name == typeof(Microsoft.Xrm.Sdk.IPlugin).Name) != null);
      var workflowTypes = assembly.DefinedTypes.Where(p => p.BaseType != null && p.BaseType.Name == typeof(System.Activities.CodeActivity).Name);

      var pluginFullName = assembly.FullName.Split(',');
      var assemblyName = pluginFullName[0];

      var existingTypes = service.RetrieveMultiple(new QueryExpression
      {
        EntityName = "plugintype",
        ColumnSet = new ColumnSet("plugintypeid"),
        Criteria = new FilterExpression
        {
          Conditions = {
            new ConditionExpression("pluginassemblyid", ConditionOperator.Equal, assemblyId)
          }
        }
      }).Entities;

      foreach (var type in pluginTypes.Concat(workflowTypes))
      {
        var plugin = new Entity("plugintype");

        plugin["pluginassemblyid"] = assemblyId;
        plugin["typename"] = type.Name;
        plugin["description"] = "";
        plugin["workflowactivitygroupname"] = assemblyName;

        if (existingTypes.Any(t => t["typename"] == type.Name))
        {
          plugin["plugintypeid"] = existingTypes.First(t => t["typename"] == type.Name).Id;

          service.Update(plugin);
        }
        else
        {
          service.Create(plugin);
        }
      }
    }
  }
}