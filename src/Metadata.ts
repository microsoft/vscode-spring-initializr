import { ITopLevelAttribute } from "./Model";
import { Utils } from "./Utils";

export class Metadata {
    public serviceUrl: string;
    private content: {
        dependencies: ITopLevelAttribute,
        // tslint:disable-next-line:no-reserved-keywords
        type: ITopLevelAttribute,
        packaging: ITopLevelAttribute,
        javaVersion: ITopLevelAttribute,
        language: ITopLevelAttribute,
        bootVersion: ITopLevelAttribute
    };

    constructor(serviceUrl: string) {
        this.serviceUrl = serviceUrl;
    }

    public async getBootVersion(): Promise<any[]> {
        if (!this.content) {
            await this.update();
        }
        if (!this.content.bootVersion) {
            return [];
        } else {
            return this.content.bootVersion.values;
        }
    }

    private async update(): Promise<void> {
        const rawJSONString: string = await Utils.downloadFile(this.serviceUrl, true, { Accept: "application/vnd.initializr.v2.1+json" });
        this.content = JSON.parse(rawJSONString);
    }
}
