import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { BaseProtocolComponent } from '../../base-protocol/base-protocol.component';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ZeekLogAttribute, ZeekLogType, ZeekConfigService } from '../../../services/zeek-config.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-common-protocol',
    template: `
        <app-base-protocol
            [protocolName]="protocolName"
            [indexName]="indexName"
            [cols]="cols"
            [rows]="rows">
            <ng-template slot="default" let-value="data">
                <div class="tooltip-container">
                    <span [title]="value">{{ truncateText(value) }}</span>
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
export class CommonProtocolComponent extends BaseProtocolComponent implements OnDestroy {
    private routeSubscription: Subscription;
    override protocolName: string = '';
    override indexName: string = '';
    attributes: ZeekLogAttribute[] = [];
    override cols: any[] = [];

    constructor(
        http: HttpClient, 
        cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private zeekConfigService: ZeekConfigService
    ) {
        super(http, cdr);
        
        // 监听路由参数变化
        this.routeSubscription = this.route.params.subscribe(params => {
            const protocol = params['protocol'];
            if (protocol) {
                this.loadProtocolConfig(protocol);
            }
        });
    }

    private loadProtocolConfig(protocol: string) {
        this.protocolName = protocol.toUpperCase();
        this.indexName = `${protocol.toLowerCase()}-realtime`;
        
        this.zeekConfigService.getZeekConfig().subscribe({
            next: (config) => {
                const protocolConfig = config.Zeek.find(
                    (p: ZeekLogType) => p.logName.toLowerCase() === protocol.toLowerCase()
                );
                if (protocolConfig) {
                    this.attributes = protocolConfig.attribute;
                    this.cols = this.attributes.map(attr => ({
                        field: attr.keyAlias,
                        title: attr.keyWord,
                        hide: !attr.defaultShow,
                        type: attr.keyType
                    }));
                }
            }
        });
    }

    override ngOnInit() {
        // 初始化时不需要做任何事情，因为已经在构造函数中设置了路由监听
    }

    override ngOnDestroy() {
        // 清理订阅
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }

    protected override processQueryResponse(response: any): void {
        this.rows = response.hits.map((hit: any) => {
            const row: any = {};
            this.attributes.forEach(attr => {
                const value = hit[attr.keyAlias];
                if (attr.keyType === 'time') {
                    row[attr.keyAlias] = this.formatDate(value);
                } else if (Array.isArray(value)) {
                    row[attr.keyAlias] = value.join(', ');
                } else {
                    row[attr.keyAlias] = value;
                }
            });
            return row;
        });
        this.total = response.total;
    }

    truncateText(text: string): string {
        if (!text) return '';
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }
} 