import { Component } from '@angular/core';
import { BaseProtocolComponent } from '../base-protocol/base-protocol.component';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ZeekConfigService } from '../../services/zeek-config.service';
import { TimeRangeService } from 'src/app/services/time-range.service';

@Component({
    selector: 'app-test-protocol',
    template: `
        <app-base-protocol
            protocolName="TEST"
            indexName="test-realtime"
            [cols]="testCols"
            [rows]="testRows">
        </app-base-protocol>
    `,
    standalone: true,
    imports: [BaseProtocolComponent]
})
export class TestProtocolComponent extends BaseProtocolComponent {
    testCols = [
        { field: 'timestamp', title: '时间戳', sortable: true, hide: false },
        { field: 'srcIp', title: '源IP', sortable: true, hide: false },
        { field: 'dstIp', title: '目标IP', sortable: true, hide: false },
        { field: 'protocol', title: '协议', sortable: true, hide: false }
    ];

    testRows = [
        {
            timestamp: new Date().toISOString(),
            srcIp: '192.168.1.100',
            dstIp: '8.8.8.8',
            protocol: 'DNS',
            status: 'completed'
        }
    ];

    constructor(http: HttpClient, cdr: ChangeDetectorRef, zeekConfigService: ZeekConfigService, private timeRangeService2: TimeRangeService) {
        super(http, cdr, zeekConfigService, timeRangeService2);
        this.protocolName = 'TEST';
        this.indexName = 'test-realtime';
        this.cols = this.testCols;
        this.rows = this.testRows;
    }

    override ngOnInit() {
        super.ngOnInit();
        console.log('测试协议组件已初始化');
        console.log('字段描述信息:', this.fieldDescriptions);
    }
}
