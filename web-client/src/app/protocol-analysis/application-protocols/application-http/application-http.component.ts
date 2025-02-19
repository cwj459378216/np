import { Component, ChangeDetectorRef } from '@angular/core';
import { BaseProtocolComponent } from '../../base-protocol/base-protocol.component';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

export interface HttpQueryResponse {
    total: number;
    hits: Array<{
        channelID: string;
        dstIP: string;
        dstPort: number;
        filePath: string;
        requestBodyLen: number;
        respFuids: string;
        respMimeTypes: string;
        responseBodyLen: number;
        srcIP: string;
        srcPort: number;
        statusCode: number;
        statusMsg: string;
        tags: string;
        timestamp: string;
        transDepth: number;
        ts: number;
        uid: string;
        version: number;
    }>;
}

@Component({
    selector: 'app-application-http',
    template: `
        <app-base-protocol
            protocolName="HTTP"
            indexName="http-realtime"
            [cols]="cols"
            [rows]="rows">
            <ng-template slot="answers" let-value="data">
                <div class="tooltip-container">
                    <span [title]="value.answers">{{ truncateText(value.answers) }}</span>
                </div>
            </ng-template>
        </app-base-protocol>
    `,
    standalone: true,
    imports: [
        BaseProtocolComponent,
        CommonModule
    ]
})
export class ApplicationHttpComponent extends BaseProtocolComponent {
    override cols = [
        { field: 'srcIP', title: 'Src.IP:Port', hide: false },
        { field: 'dstIP', title: 'Dst.IP:Port', hide: false },
        { field: 'statusCode', title: 'Status Code', hide: false },
        { field: 'statusMsg', title: 'Status Message', hide: false },
        { field: 'requestBodyLen', title: 'Request Length', hide: false },
        { field: 'responseBodyLen', title: 'Response Length', hide: false },
        { field: 'respMimeTypes', title: 'MIME Types', hide: false },
        { field: 'lastUpdateTime', title: 'Last Updated Time', hide: false },
        { field: 'channelID', title: 'Channel ID', hide: true },
        { field: 'filePath', title: 'File Path', hide: true },
        { field: 'respFuids', title: 'Response FUIDs', hide: true },
        { field: 'tags', title: 'Tags', hide: true },
        { field: 'transDepth', title: 'Trans Depth', hide: true },
        { field: 'uid', title: 'UID', hide: true },
        { field: 'version', title: 'Version', hide: true }
    ];

    constructor(http: HttpClient, cdr: ChangeDetectorRef) {
        super(http, cdr);
    }

    protected override processQueryResponse(response: HttpQueryResponse): void {
        this.rows = response.hits.map(hit => ({
            srcIP: `${hit.srcIP}:${hit.srcPort}`,
            dstIP: `${hit.dstIP}:${hit.dstPort}`,
            statusCode: hit.statusCode,
            statusMsg: hit.statusMsg,
            requestBodyLen: hit.requestBodyLen,
            responseBodyLen: hit.responseBodyLen,
            respMimeTypes: hit.respMimeTypes,
            lastUpdateTime: this.formatDate(hit.timestamp),
            channelID: hit.channelID,
            filePath: hit.filePath,
            respFuids: hit.respFuids,
            tags: hit.tags,
            transDepth: hit.transDepth,
            uid: hit.uid,
            version: hit.version
        }));
        this.total = response.total;
    }

    truncateText(text: string): string {
        if (!text) return '';
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }
}
  