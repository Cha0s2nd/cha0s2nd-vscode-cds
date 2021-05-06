# Cha0s Data Tools (Dynamics 365)

An extension to assist when working with Dynamics 365 (CRM) and Common Data Services customizations.<br>The idea was to make uploading and publising webresources easier, and eventially manage the entire dev process.

#### This extension is currently in beta, more features are being added and with it more bugs

Early-bound classes are generated using the [DLaB.Xrm.EarlyBoundGenerator](https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator).<br>
Support for [Spkl](https://github.com/scottdurow/SparkleXrm/wiki/spkl) has been included, this is currently the only way to do plugin deployments with this extension.

Currently not supported but planned for future:
* Update Plugin/Workflow Assemblies
* Generate Early-bounds for javascript & typescript

### Licence

The source code to this extension is available on https://github.com/Cha0s2nd/cha0s2nd-vscode-cds and licensed under the [MIT licence](https://cha0s2nd.neocities.org/vscode/extensions/cds/license.html).

## Features

Deploy web resources in bulk or individually.

![deploy-webresources](media/samples/deploy-webresources.gif)

Generate Early-bound Entities

![earlybound](media/samples/earlybound.gif)

Export/Extract Solutions

![deploy-webresources](media/samples/export-solution.gif)

Import Solutions

![deploy-webresources](media/samples/import-solution.gif)

Spkl commands

![deploy-webresources-spkl](media/samples/spkl.gif)

## Requirements

The [dotnet-cli](https://dotnet.microsoft.com/download/) is required for the dependencies to install and [.Net 4.6.2](https://dotnet.microsoft.com/download/) is required for Dynamics development.
If you wish to use [Spkl](https://www.nuget.org/packages/spkl/) please install the required NuGet packages in the projects.

## Getting Started

Please refer to the [getting started wiki page](https://github.com/Cha0s2nd/cha0s2nd-vscode-cds/wiki/Getting-Started) for more detail.

The following 3 simple steps should get you running:
1. Create a base C# class library project.
2. Customize the local file locations.
3. Download and map web resources.

## Extension Settings

* `cha0s2nd-vscode-cds.webresources.folder`: The folder containing the local Solution web resources
* `cha0s2nd-vscode-cds.earlybound.namespace`: The namespace to use for early-bound classes
* `cha0s2nd-vscode-cds.earlybound.generateActions`: Should early-bound Actions be generated
* `cha0s2nd-vscode-cds.earlybound.actionFilename`: The early-bound Actions file name (from workspace root)
* `cha0s2nd-vscode-cds.earlybound.generateActions`: Should early-bound Entities be generated
* `cha0s2nd-vscode-cds.earlybound.entityFilename`: The early-bound Entities file name (from workspace root)
* `cha0s2nd-vscode-cds.earlybound.generateActions`: Should early-bound OptionSets be generated
* `cha0s2nd-vscode-cds.earlybound.optionSetFilename`: The early-bound OptionSets file name (from workspace root)
* `cha0s2nd-vscode-cds.earlybound.serviceContextName`: The name of the organization service context for early-bound classes
* `cha0s2nd-vscode-cds.earlybound.generatorSettings`: The [DLaB.Xrm.EarlyBoundGenerator](https://github.com/daryllabar/DLaB.Xrm.XrmToolBoxTools/wiki/Early-Bound-Generator) Settings
* `cha0s2nd-vscode-cds.solution.folder`: The folder containing the local extracted Solution files
* `cha0s2nd-vscode-cds.solution.zipfolder`: This is a optional setting to specify where the temp zip file will be dumped when importing or exporting.
* `cha0s2nd-vscode-cds.solution.exportManaged`: Export the Solution as Managed
* `cha0s2nd-vscode-cds.solution.exportUnmanaged`: Export the Solution as Unmanaged
* `cha0s2nd-vscode-cds.spkl.enabled`: This enabled the use of [Spkl](https://github.com/scottdurow/SparkleXrm/wiki/spkl)
* `cha0s2nd-vscode-cds.spkl.useCachedConnections`: This is to enable the use of the build in spkl connections, if disabled it uses the connection cache with the extension login.

## Known Issues

Organization Discovery tokens do not always refresh, this seems to be because of refresh_token expiry times being unknown.

## Release Notes

### [0.0.13]
Added
- Plugin Assembly Registration (no steps yet)

Please refer to [CHANGELOG.md](https://github.com/Cha0s2nd/cha0s2nd-vscode-cds/blob/master/CHANGELOG.md) for more detail.

-----------------------------------------------------------------------------------------------------------