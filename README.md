# Cha0s Data Tools (Dynamics 365)

An extension to lessen the woes of working with Dynamics 365 (CRM) and Common Data Services customizations. The idea was to make uploading and publising webresources a breeze (something that I magnaged to do), and eventially manage the entire dev process.

#### This extension is currently in beta, more features are being added and with it more bugs

I've included support for [Spkl](https://github.com/scottdurow/SparkleXrm/wiki/spkl), currently the only way to do plugin deployments and earlybound entities with this extension.

Currently not supported but planned for future:
 * Update Assemblies
 * Deploy Plugin Steps (SDK Message Processing Steps)
  * Deploy Workflows
   * Generate Earlybounds for javascript & typescript
  * Generate C# Earlybounds

## Features

Deploy web resources in bulk or individually.

![deploy-webresources](media/samples/deploy-webresources.gif)

Export/Extract Solutions

![deploy-webresources](media/samples/export-solution.gif)

Import Solutions

![deploy-webresources](media/samples/import-solution.gif)

Spkl commands

![deploy-webresources](media/samples/spkl.gif)

## Requirements

SolutionPackager.exe is required to use the solution features.
Either the [Spkl](https://www.nuget.org/packages/spkl/) or [Microsoft.CrmSdk.CoreTools](https://www.nuget.org/packages/Microsoft.CrmSdk.CoreTools/) nuget packages need to be installed in one of the projects to obtain it.

## Getting Started

Please refer to the [getting started wiki page](https://github.com/Cha0s2nd/cha0s2nd-vscode-cds/wiki/Getting-Started) for more detail.

The following 4 simple steps should get you running:
1. Create a base C# class library project.
2. Install the [Microsoft.CrmSdk.CoreTools](https://www.nuget.org/packages/Microsoft.CrmSdk.CoreTools/) nuget package.
3. Customize the local file locations.
4. Download and map web resources.

## Extension Settings

* `cha0s2nd-vscode-cds.webresources.folder`: The folder containing the local Solution web resources
* `cha0s2nd-vscode-cds.solution.folder`: The folder containing the local extracted Solution files
* `cha0s2nd-vscode-cds.solution.zipfolder`: This is a optional setting to specify where the temp zip file will be dumped when importing or exporting.
* `cha0s2nd-vscode-cds.solution.exportManaged`: Export the Solution as Managed
* `cha0s2nd-vscode-cds.solution.exportManaged`: Export the Solution as Unmanaged
* `cha0s2nd-vscode-cds.spkl.enabled`: This enabled the use of [Spkl](https://github.com/scottdurow/SparkleXrm/wiki/spkl)
* `cha0s2nd-vscode-cds.spkl.useCachedConnections`: This is to enable the use of the build in spkl connections, if disabled it uses the connection cache with the extension login.

## Known Issues

It's new, will update as soon as they become known

## Release Notes

### 0.0.6

Initial release

-----------------------------------------------------------------------------------------------------------