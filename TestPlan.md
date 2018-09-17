# Generate a Maven Project

**Quickstart with dependency search**

1. Open VS Code without opening any folder.
1. Open `Command Palette`, execute command `Spring Initializr: Generate a Maven Project`.
1. Input a invalid `Group Id`, verify:
    1. It doesn't pass the validation.
1. Input a valid `Group Id`, e.g. `com.microsoft.example`, press `<Enter>`.
1. Input a invalid `Artifact Id`, verify:
    1. It doesn't pass the validation.
1. Input a valid `Artifact Id`, e.g. `sample-artifact`, press `Enter`.
1. Select a version, verify:
    1. It lists compatible dependencies for the specified version you selected.
1. Select some dependencies, verify:
    1. Selected dependency is entitled by a check mark, and is placed ahead of the dependency list.
    1. Can cancel the selection by pressing `<Enter>` on a selected dependency.
    1. The first entry is `Selected # dependency(ies)`, and `#` is the number of seleted entries.
1. Press `<Enter>` on `Selected # dependency(ies)`, verify:
    1. It pops up a directory-selection dialog.
1. Choose a target folder, verify:
    1. During generating, it shows process in status bar.
    1. After the process disappear, it shows a information message box on the top.
1. Click `Open it`, verify:
    1. It opens the project in current window.
1. Open `pom.xml` in root folder, verify:
    1. `Group Id` and `Artifact Id` are correct.
    1. Selected dependencies are added under `<dependencies>` tag.
1. Verify the folder structure is organized as `Group Id`.

**Quickstart with last settings**

1. Open `Command Palette`, execute command `Spring Initializr: Generate a Maven Project`.
1. Input a valid `Group Id`, e.g. `com.microsoft.example`, press `<Enter>`.
1. Input a valid `Artifact Id`, e.g. `sample-artifact`, press `Enter`.
1. Press `<Enter>` on `Use Last Settings`, verify:
    1. The dialog shows the dependeny(ies) name in last settings.
1. Choose a target folder, open it and verify the `pom.xml`, using same steps above. 


# Generate a Gradle Project

Same steps with above, but using command `Spring Initializr: Generate a Gradle Project`.

After that, verify `build.gradle` instead of `pom.xml`.

# Customized Spring Initializr Service URL
1. Open `User settings` in VS Code.
1. Change value of entry `spring.initializr.serviceUrl`, e.g. "http://start.cfapps.io/", or [run the service locally](https://github.com/spring-io/initializr#running-the-app-locally)
1. Verify:
    1. Can generate a project from the specified service URL.

# Default value of GroupId and ArtifactId.
1. Open `User settings` in VS Code.
1. Change values of entry `spring.initializr.defaultGroupId`, `spring.initializr.defaultArtifactId`.
1. Open `Command Palette`, execute command `Spring Initializr: Generate a Maven Project`.
1. Verify:
    1. `GroupId` and `ArtifactId` are filled by the specified default values.

# Default value of language.
1. Open `User settings` in VS Code.
2. Change values of entry `spring.initializr.defaultLanguage` to `""`.
3. Verify:
    1. It allows to select language during generating the project.
    2. Open the generated project, the language matches what you selected.
4. Change values of entry `spring.initializr.defaultLanguage` to `"Java"`.
5. Verify:
    1. It skips the step to select language, and directly uses the value you set.

# Default value of packaging.
1. Open `User settings` in VS Code.
2. Change values of entry `spring.initializr.defaultPackaging` to `""`.
3. Verify:
    1. It allows to select packaging type during generating the project.
    2. Open the generated project, the packaging type matches what you selected.
4. Change values of entry `spring.initializr.defaultPackaging` to `"WAR"`.
5. Verify:
    1. It skips the step to select packaging type, and directly uses the value you set.

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
