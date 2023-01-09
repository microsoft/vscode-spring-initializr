# Change Log
All notable changes to the "vscode-spring-initializr" extension will be documented in this file.

## 0.11.2
### Fixed
- Incorrect Java version was picked up. [#224](https://github.com/microsoft/vscode-spring-initializr/issues/224)

## 0.11.1
### Fixed
- Input boxes freeze when value is invalid, since VS Code v1.73.0. [#219](https://github.com/microsoft/vscode-spring-initializr/pull/219)

## 0.11.0
### Added
- Show separator between starter groups. [#210](https://github.com/microsoft/vscode-spring-initializr/pull/210)
- Add link buttons onto starter candidates. [#211](https://github.com/microsoft/vscode-spring-initializr/pull/211)

### Fixed
- Show progress when fetching metadata. [#213](https://github.com/microsoft/vscode-spring-initializr/pull/213)

## 0.10.1
- Open HELP.md for newly created projects. [#207](https://github.com/microsoft/vscode-spring-initializr/pull/207)

## 0.10.0
### Fixed
- Fix version detection when `relativePath` is not specified. [#202](https://github.com/microsoft/vscode-spring-initializr/pull/202)

## 0.9.0
### Added
- New setting `spring.initializr.parentFolder` to control if a new sub-folder should be created for the newly generated project. [#197](https://github.com/microsoft/vscode-spring-initializr/pull/197)

### Fixed
- Fix Group Id validation. [#199](https://github.com/microsoft/vscode-spring-initializr/pull/199)

## 0.8.0
### Added
- Support virtual workspaces. [#185](https://github.com/microsoft/vscode-spring-initializr/issues/185)

### Changed
- Use `htmlparser2` to parse XML file. [#192](https://github.com/microsoft/vscode-spring-initializr/pull/192)

### Fixed
- Error: Fail to edit starters. [#193](https://github.com/microsoft/vscode-spring-initializr/pull/193)
- Vulnerabilities in dependencies.

## 0.7.1
### Fixed
- Error: end of central directory record signature not found. [#191](https://github.com/microsoft/vscode-spring-initializr/issues/191)

## 0.7.0
### Fixed
- Align options of project metadata with Spring Initializr service. [#173](https://github.com/microsoft/vscode-spring-initializr/pull/173)

## 0.6.1
- Fix Error: Cannot read property 'split' of undefined. [#162](https://github.com/microsoft/vscode-spring-initializr/issues/162#issuecomment-726832226)

## 0.6.0
- Allow commands to start initializr wizard with default selections.
- Add a new setting `spring.initializr.defaultOpenProjectMethod` for default project opening method.
- Optimize UX of the multi-step wizard for creating a project. [#156](https://github.com/microsoft/vscode-spring-initializr/pull/156)
- Fix Error: Cannot read property 'split' of undefined. [#159](https://github.com/microsoft/vscode-spring-initializr/issues/159)
- Remove extra chars in title bar. [#158](https://github.com/microsoft/vscode-spring-initializr/issues/158)

## 0.5.0
### Added
- Can specify Java vesrion. [#146](https://github.com/microsoft/vscode-spring-initializr/pull/146)
- Can specify packaging type. [#150](https://github.com/microsoft/vscode-spring-initializr/pull/150)
- Added back buttons. It's able to switch back to previous steps when creating projects. [#148](https://github.com/microsoft/vscode-spring-initializr/pull/148)
- Spring Initialzr API v2.2 is supported. [#143](https://github.com/microsoft/vscode-spring-initializr/pull/143) [#145](https://github.com/microsoft/vscode-spring-initializr/pull/145)

### Changed
- "Edit Starters" is changed to "Add Starters", i.e. removing starters from current project is not supported by this command. [#149](https://github.com/microsoft/vscode-spring-initializr/pull/149)
- Change order of steps when creating a project.

### Fixed
- Use current workspace as default target folder. [#140](https://github.com/microsoft/vscode-spring-initializr/pull/140)

## 0.4.8
- Update dependencies to fix issue in telemetry.

## 0.4.7
### Fixed
- Vulnerabilities.

## 0.4.6
### Fixed
- A bug that there is no response when failing to download zip package. [#120](https://github.com/microsoft/vscode-spring-initializr/issues/120)

## 0.4.5
### Fixed
- A bug of Spring Boot project recognition. [#110](https://github.com/Microsoft/vscode-spring-initializr/issues/110)
- A potential NPE. [PR#114](https://github.com/Microsoft/vscode-spring-initializr/pull/114)

## 0.4.4
### Changed
- Use webpack to improve the extension startup time. [PR#98](https://github.com/Microsoft/vscode-spring-initializr/pull/98)
- Allow users to specify multiple service URLs. [PR#99](https://github.com/Microsoft/vscode-spring-initializr/pull/99)

### Fixed
- A potential NPE. [#102](https://github.com/Microsoft/vscode-spring-initializr/issues/102)
- A bug that the generated .zip file is being extracted before it is completely downloaded. [#103](https://github.com/Microsoft/vscode-spring-initializr/issues/103)

## 0.4.3
- Allow users to add generated projects to current workspace.

## 0.4.2
- Allow users to choose another target folder if an existing folder is found. [#88](https://github.com/Microsoft/vscode-spring-initializr/issues/88)

## 0.4.1
- Improved experience of editing starters. [#79](https://github.com/Microsoft/vscode-spring-initializr/issues/79)
- Fixed a bug that mvnw could not be executed in Unix-like systems. [#66](https://github.com/Microsoft/vscode-spring-initializr/issues/66)

## 0.4.0
- Supported to specify packaging type. [#68](https://github.com/Microsoft/vscode-spring-initializr/issues/68)
- Created a base directory named after the artifact Id. [#72](https://github.com/Microsoft/vscode-spring-initializr/issues/72)
- Fixed some bugs.

## 0.3.0
- Supported to edit starters of an existing Spring Boot Maven project.
- Supported to generate Kotlin and Groovy projects.
- Supported to specify default language of projects.
- Fixed some bugs.

## 0.2.0
- Supported to specify Spring Initializr service URL.
- Supported to specify Spring Boot version.
- Supported to specify default Group/Artifact Id.
- Updated extension icon.
- Fixed some bugs.

## 0.1.0
- Supported to generate a Maven project with Spring Initializr.
- Supported to generate a Gradle project with Spring Initializr.
