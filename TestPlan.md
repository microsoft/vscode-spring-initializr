# Generate a Project
## Generate a Maven Project

### Quickstart with dependency search

1. Open VS Code without opening any folder.
2. Open `Command Palette`, execute command `Spring Initializr: Generate a Maven Project`.
3. Input a invalid `Group Id`, verify:
    1. It doesn't pass the validation.
4. Input a valid `Group Id`, e.g. `com.microsoft.example`, press `<Enter>`.
5. Input a invalid `Artifact Id`, verify:
    1. It doesn't pass the validation.
6. Input a valid `Artifact Id`, e.g. `sample-artifact`, press `Enter`.
7. Select a version, verify:
    1. It lists compatible dependencies for the specified version you selected.
8. Select some dependencies, verify:
    1. Selected dependency is entitled by a check mark, and is placed ahead of the dependency list.
    2. Can cancel the selection by pressing `<Enter>` on a selected dependency.
    3. The first entry is `Selected # dependency(ies)`, and `#` is the number of seleted entries.
9. Press `<Enter>` on `Selected # dependency(ies)`, verify:
    1. It pops up a directory-selection dialog.
10. Choose a target folder, verify:
    1. During generating, it shows process in status bar.
    2. After the process disappear, it shows a information message box on the top.
11. Click `Open it`, verify:
    1. It opens the project in current window.
12. Open `pom.xml` in root folder, verify:
    1. `Group Id` and `Artifact Id` are correct.
    2. Selected dependencies are added under `<dependencies>` tag.
13. Verify the folder structure is organized as `Group Id`.

### Quickstart with last settings

1. Open `Command Palette`, execute command `Spring Initializr: Generate a Maven Project`.
2. Input a valid `Group Id`, e.g. `com.microsoft.example`, press `<Enter>`.
3. Input a valid `Artifact Id`, e.g. `sample-artifact`, press `Enter`.
4. Press `<Enter>` on `Use Last Settings`, verify:
    1. The dialog shows the dependeny(ies) name in last settings.
5. Choose a target folder, open it and verify the `pom.xml`, using same steps above. 


## Generate a Gradle Project

Same steps with above, but using command `Spring Initializr: Generate a Gradle Project`.

After that, verify `build.gradle` instead of `pom.xml`.

## Customized Spring Initializr Service URL
1. Open `User settings` in VS Code.
2. Change value of entry `spring.initializr.serviceUrl`, e.g. "https://start.cfapps.io", or [run the service locally](https://github.com/spring-io/initializr#running-the-app-locally) (if the previous one doesn't work). 
3. Verify:
    1. Can generate a project from the specified service URL.
4. Change value of entry `spring.initializr.serviceUrl` to an array, e.g. ["https://start.cfapps.io", "https://start.spring.io"]
5. Verify:
    1. Before generating a project/editing starters, it requires users to select one from the list.
    2. Can generate a project from the selected service URL.


## Default Values
### Default value of GroupId and ArtifactId.
1. Open `User settings` in VS Code.
2. Change values of entry `spring.initializr.defaultGroupId`, `spring.initializr.defaultArtifactId`.
3. Open `Command Palette`, execute command `Spring Initializr: Generate a Maven Project`.
4. Verify:
    1. `GroupId` and `ArtifactId` are filled by the specified default values.

### Default value of language.
1. Open `User settings` in VS Code.
2. Change values of entry `spring.initializr.defaultLanguage` to `""`.
3. Verify:
    1. It allows to select language during generating the project.
    2. Open the generated project, the language matches what you selected.
4. Change values of entry `spring.initializr.defaultLanguage` to `"Java"`.
5. Verify:
    1. It skips the step to select language, and directly uses the value you set.

### Default value of Java version.
1. Open `User settings` in VS Code.
2. Change values of entry `spring.initializr.defaultJavaVersion` to `""`.
3. Verify:
    1. It allows to select Java version during generating the project.
    2. Open the generated project, the Java version matches what you selected.
4. Change values of entry `spring.initializr.defaultJavaVersion` to `"1.8"`.
5. Verify:
    1. It skips the step to select Java version, and directly uses the value you set.

### Default value of packaging.
1. Open `User settings` in VS Code.
2. Change values of entry `spring.initializr.defaultPackaging` to `""`.
3. Verify:
    1. It allows to select packaging type during generating the project.
    2. Open the generated project, the packaging type matches what you selected.
4. Change values of entry `spring.initializr.defaultPackaging` to `"WAR"`.
5. Verify:
    1. It skips the step to select packaging type, and directly uses the value you set.

## Ways of opening generated projects. 
### No workspace folder in current windows 
1. Open VS Code without any workspace folder. 
2. Generate a Maven/Gradle project.
3. When it's completed, verify:
    1. It pops up a dialog with button `Open`.
    2. Click `Open`, it opens the project in current window.

### Has worksapce folder in current window. 
1. Open VS Code, and open a folder. 
2. Generate a Maven/Gradle project.
3. When it's completed, verify:
    1. It pops up a dialog with buttons `Open`, `Add to Workspace`.
    2. Click `Open`, it opens the project in a new window.
    3. Click `Add to Workspace`, it opens the project as a workspace folder in current window.


# Edit Starters for Spring Boot Maven projects.
1. Generate a maven project as above, select some dependencies.
2. Open `pom.xml` file, verify current value of `dependencies` node.
3. Right click on the editing area of the file, choose `Edit starters`.
4. In the QuickPick box, do some selection and unselection, and proceed following the prompt messages.
5. Verify:
    1. The `pom.xml` file is modified, and the project can still be built by `mvn package`.
    2. Corresponding `<dependency>` nodes are added/removed.
    3. For dependencies with `bom` information, e.g. `azure`, a `<DependencyManagement>` node is added into the pom file.
    4. For dependencies with `repository` information, e.g. `Spring Shell`, a `<repository>` node is added into the pom file.
