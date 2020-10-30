# Cha0s Data Tools (Dynamics CRM)

An extension to lessen the woes of working with Dynamics CRM cusomizations. The idea was to make uploading and publising webresources a breeze (something that I magnaged to do), and eventially manage the entire dev process.

#### This extension is currently in beta, more features are being added and with it more bugs

I've included support for [spkl](https://github.com/scottdurow/SparkleXrm/wiki/spkl), currently the only way to do plugin deployments and earlybound entities with this extension.

Currently not supported but planned for future:
    Update Assemblies
    Deploy Plugin Steps (SDK Message Processing Steps)
    Deploy Workflows

## Features

Deploy web resources in bulk or individually.


Export/Extract Solutions


Import Solutions


Spkl commands


## Requirements

SolutionPackager.exe is required to used the solution features:
Either the [spkl](https://www.nuget.org/packages/spkl/) or [microsoft.crmsdk.coretools](https://www.nuget.org/packages/Microsoft.CrmSdk.CoreTools/) nuget packages need to be installed to obtain it.

## Getting Started

1. Create a base C# class library project.
2. Install the [microsoft.crmsdk.coretools](https://www.nuget.org/packages/Microsoft.CrmSdk.CoreTools/) nuget package.
3. Customize the local file locations.
4. Download and map web resources.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

* `cha0s2nd-vscode-cds.webresources.folder`: The folder containing the local Solution web resources
* `cha0s2nd-vscode-cds.solution.folder`: The folder containing the local extracted Solution files
* `cha0s2nd-vscode-cds.solution.zipfolder`: This is a optional setting to specify where the temp zip file will be dumped when importing or exporting.
* `cha0s2nd-vscode-cds.solution.exportManaged`: Export the Solution as Managed
* `cha0s2nd-vscode-cds.solution.exportManaged`: Export the Solution as Unmanaged
* `cha0s2nd-vscode-cds.spkl.enabled`: This enabled the use of [spkl](https://github.com/scottdurow/SparkleXrm/wiki/spkl)
* `cha0s2nd-vscode-cds.spkl.useCachedConnections`: This is to enable the use of the build in spkl connections, if disabled it uses the connection cache with the extension login.

## Known Issues

It's new, will update as soon as they become known

## Release Notes

### 0.0.1

Initial release

-----------------------------------------------------------------------------------------------------------