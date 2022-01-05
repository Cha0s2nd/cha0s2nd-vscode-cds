using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Tooling.Connector;
using sdk_wrapper.Entities;

namespace sdk_wrapper.Managers
{
  public sealed class PluginManager
  {
    public static void UpdateAssembly(CrmServiceClient service, string solutionName, string filePath)
    {
      var assemblyFile = Assembly.LoadFrom(filePath);
      var pluginFullName = assemblyFile.FullName.Split(',');
      var name = pluginFullName[0];
      var version = pluginFullName[1].Replace("Version=", "").Trim();
      var culture = pluginFullName[2].Replace("Culture=", "").Trim();
      var publicToken = pluginFullName[3].Replace("PublicKeyToken=", "").Trim();

      Console.Out.WriteLine($"Using Solution \"{solutionName ?? "Default"}\"");
      Console.Out.WriteLine($"Using Plugin Assembly \"{name}\"");

      var assembly = new PluginAssembly();
      var assemblyId = Guid.NewGuid();

      assembly.Name = name;
      assembly.Culture = culture;
      assembly.Version = version;
      assembly.PublicKeyToken = publicToken;
      assembly.SourceTypeEnum = PluginAssembly_SourceType.Database;
      assembly.IsolationModeEnum = PluginAssembly_IsolationMode.Sandbox;
      assembly.Content = Convert.ToBase64String(File.ReadAllBytes(filePath));

      var existingAssemblies = service.RetrieveMultiple(new QueryExpression
      {
        EntityName = PluginAssembly.EntityLogicalName,
        ColumnSet = new ColumnSet(PluginAssembly.Fields.PluginAssemblyId),
        Criteria = new FilterExpression
        {
          Conditions = {
            new ConditionExpression(PluginAssembly.Fields.Name, ConditionOperator.Equal, assembly.Name)
          }
        }
      }).Entities;

      ExecuteTransactionRequest transaction = new ExecuteTransactionRequest
      {
        Requests = new OrganizationRequestCollection()
      };

      if (existingAssemblies.Count == 0)
      {
        assembly.PluginAssemblyId = assemblyId;

        Console.Out.WriteLine("Registering new Assembly...");
        transaction.Requests.Add(new CreateRequest { Target = assembly });
      }
      else if (existingAssemblies.Count == 1)
      {
        assembly.PluginAssemblyId = assemblyId = existingAssemblies.First().Id;

        Console.Out.WriteLine("Updating existing Assembly...");
        transaction.Requests.Add(new UpdateRequest { Target = assembly });
      }
      else
      {
        throw new Exception($"Multiple plugin assemblies found for \"{name}\", cannot determine update target.");
      }

      transaction.Requests.AddRange(CreatePluginRequests(service, solutionName, assemblyFile, assemblyId));

      Console.WriteLine("Executing...");
      service.Execute(transaction);

      if (!string.IsNullOrWhiteSpace(solutionName))
      {
        Console.WriteLine("Adding to Solution...");
        service.Execute(new AddSolutionComponentRequest()
        {
          AddRequiredComponents = true,
          ComponentType = (int)ComponentType.PluginAssembly,
          ComponentId = assemblyId,
          SolutionUniqueName = solutionName
        });
      }
    }

    public static IEnumerable<OrganizationRequest> CreatePluginRequests(CrmServiceClient service, string solutionName, Assembly assembly, Guid assemblyId)
    {
      var requests = new List<OrganizationRequest>();
      var pluginTypes = assembly.GetExportedTypes().Where(p => p.GetInterfaces().FirstOrDefault(i => i.Name == typeof(Microsoft.Xrm.Sdk.IPlugin).Name) != null && !p.IsAbstract && p.IsClass);
      var workflowTypes = assembly.DefinedTypes.Where(p => p.IsSubclassOf(typeof(System.Activities.CodeActivity)) && !p.IsAbstract && p.IsClass);
      var allTypes = pluginTypes.Concat(workflowTypes);

      Console.Out.WriteLine($"Found {allTypes.Count()} types ({pluginTypes.Count()} Plugins) ({workflowTypes.Count()} Workflow Activities)");

      var pluginFullName = assembly.FullName.Split(',');
      var assemblyName = pluginFullName[0];
      var version = pluginFullName[1].Replace("Version=", "").Trim();

      var existingTypes = service.RetrieveMultiple(new QueryExpression
      {
        EntityName = PluginType.EntityLogicalName,
        ColumnSet = new ColumnSet(PluginType.Fields.PluginTypeId, PluginType.Fields.TypeName),
        Criteria = new FilterExpression
        {
          Conditions = {
            new ConditionExpression(PluginType.Fields.PluginAssemblyId, ConditionOperator.Equal, assemblyId)
          }
        }
      }).Entities.Select(e => e.ToEntity<PluginType>());

      var pluginCreates = 0;
      var pluginUpdates = 0;
      var workflowCreates = 0;
      var workflowUpdates = 0;

      foreach (var type in allTypes)
      {
        var plugin = new PluginType
        {
          PluginAssemblyId = new EntityReference(PluginAssembly.EntityLogicalName, assemblyId),
          Name = type.FullName,
          TypeName = type.FullName,
          WorkflowActivityGroupName = workflowTypes.Contains(type) ? $"{assemblyName} ({version})" : null
        };

        if (existingTypes.Any(t => t.TypeName == plugin.TypeName))
        {
          plugin.PluginTypeId = existingTypes.First(t => t.TypeName == plugin.TypeName).Id;

          if (workflowTypes.Contains(type)) { workflowUpdates++; } else { pluginUpdates++; }
          requests.Add(new UpdateRequest { Target = plugin });
        }
        else
        {
          if (workflowTypes.Contains(type)) { workflowCreates++; } else { pluginCreates++; }
          requests.Add(new CreateRequest { Target = plugin });
        }
      }

      Console.WriteLine($"Plugins Creates: {pluginCreates}");
      Console.WriteLine($"Plugins Updates: {pluginUpdates}");
      Console.WriteLine($"Workflow Activity Creates: {workflowCreates}");
      Console.WriteLine($"Workflow Activity Updates: {workflowUpdates}");

      return requests;
    }
  }
}