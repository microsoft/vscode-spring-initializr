# Change Log
All notable changes to the "vscode-spring-initializr" extension will be documented in this file.

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
