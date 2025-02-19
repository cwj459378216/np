import { Component, ChangeDetectorRef } from '@angular/core';
import { BaseProtocolComponent } from '../../base-protocol/base-protocol.component';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

export interface DnsQueryResponse {
    total: number;
    hits: Array<{
        AA: string;
        RA: string;
        RD: string;
        TC: string;
        TTL: number;
        Z: number;
        answers: string;
        channelID: string;
        dstIP: string;
        dstPort: number;
        filePath: string;
        proto: string;
        qclass: number;
        qclassName: string;
        qtype: number;
        qtypeName: string;
        query: string;
        rcode: number;
        rcodeName: string;
        rejected: string;
        rtt: number;
        srcIP: string;
        srcPort: number;
        timestamp: string;
        transId: number;
        ts: number;
        uid: string;
    }>;
}

@Component({
    selector: 'app-application-dns',
    template: `
        <app-base-protocol
            protocolName="DNS"
            indexName="dns-realtime"
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
export class ApplicationDnsComponent extends BaseProtocolComponent {
    override cols = [
        { field: 'query', title: 'Query', hide: false },
        { field: 'qtypeName', title: 'Query Type', hide: true },
        { field: 'rcodeName', title: 'Response Code', hide: true },
        { field: 'answers', title: 'Answers', hide: false },
        { field: 'TTL', title: 'TTL', hide: true },
        { field: 'srcIP', title: 'Source IP:Port', hide: false },
        { field: 'dstIP', title: 'Destination IP:Port', hide: false },
        { field: 'proto', title: 'Protocol', hide: false },
        { field: 'lastUpdateTime', title: 'Last Update Time', hide: false },
        { field: 'uid', title: 'UID', hide: true },
        { field: 'channelID', title: 'Channel ID', hide: true },
        { field: 'filePath', title: 'Interface', hide: true },
        { field: 'transId', title: 'Transaction ID', hide: true },
        { field: 'qclass', title: 'Query Class', hide: true },
        { field: 'qclassName', title: 'Query Class Name', hide: true },
        { field: 'qtype', title: 'Query Type Code', hide: true },
        { field: 'rcode', title: 'Response Code', hide: true },
        { field: 'AA', title: 'Authoritative Answer', hide: true },
        { field: 'TC', title: 'Truncated', hide: true },
        { field: 'RD', title: 'Recursion Desired', hide: true },
        { field: 'RA', title: 'Recursion Available', hide: true },
        { field: 'Z', title: 'Reserved', hide: true },
        { field: 'rejected', title: 'Rejected', hide: true },
        { field: 'rtt', title: 'RTT', hide: true }
    ];

    constructor(http: HttpClient, cdr: ChangeDetectorRef) {
        super(http, cdr);
    }

    protected override processQueryResponse(response: DnsQueryResponse): void {
        this.rows = response.hits.map(hit => ({
            query: hit.query,
            qtypeName: hit.qtypeName,
            rcodeName: hit.rcodeName,
            answers: hit.answers,
            TTL: hit.TTL,
            srcIP: `${hit.srcIP}:${hit.srcPort}`,
            dstIP: `${hit.dstIP}:${hit.dstPort}`,
            proto: hit.proto,
            lastUpdateTime: this.formatDate(hit.timestamp),
            uid: hit.uid,
            channelID: hit.channelID,
            filePath: hit.filePath,
            transId: hit.transId,
            qclass: hit.qclass,
            qclassName: hit.qclassName,
            qtype: hit.qtype,
            rcode: hit.rcode,
            AA: hit.AA,
            TC: hit.TC,
            RD: hit.RD,
            RA: hit.RA,
            Z: hit.Z,
            rejected: hit.rejected,
            rtt: hit.rtt
        }));
        this.total = response.total;
    }

    truncateText(text: string): string {
        if (!text) return '';
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }
} 