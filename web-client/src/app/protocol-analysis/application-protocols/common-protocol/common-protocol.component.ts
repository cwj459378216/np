import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { BaseProtocolComponent } from '../../base-protocol/base-protocol.component';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ZeekLogAttribute, ZeekLogType, ZeekConfigService } from '../../../services/zeek-config.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TimeRangeService } from 'src/app/services/time-range.service';
import { TranslateService } from '@ngx-translate/core';

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
    // 重命名以避免与基类 private routeSubscription 冲突
    private routeParamSubscription: Subscription;
    override protocolName: string = '';
    override indexName: string = '';
    attributes: ZeekLogAttribute[] = [];
    override cols: any[] = [];

    constructor(
        http: HttpClient,
        cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router2: Router,
        protected override zeekConfigService: ZeekConfigService,
        private timeRangeService2: TimeRangeService,
        translate: TranslateService
    ) {
    // 传递 router 给父类
    super(http, cdr, zeekConfigService, timeRangeService2, router2, translate);

        // 监听路由参数变化
    this.routeParamSubscription = this.route.params.subscribe(params => {
            const protocol = params['protocol'];
            if (protocol) {
                this.loadProtocolConfig(protocol);
            }
        });
    }

    private loadProtocolConfig(protocol: string) {
        this.protocolName = protocol.toUpperCase();
        this.indexName = `${protocol.toLowerCase()}-*`;

        this.zeekConfigService.getZeekConfig().subscribe({
            next: (config) => {
                console.log('Zeek配置:', config);
                const protocolConfig = config.Zeek.find(
                    (p: ZeekLogType) => p.logName.toLowerCase() === protocol.toLowerCase()
                );
                if (protocolConfig) {
                    // 构建完整的属性列表，包含 BeginAttr、协议特定字段和 EndAttr
                    this.attributes = this.buildCompleteAttributes(config, protocolConfig);

                    // 根据完整的属性列表构建列配置
                    this.cols = this.attributes.map(attr => ({
                        field: attr.keyAlias,
                        title: this.capitalize(attr.keyAlias),
                        hide: !attr.defaultShow,
                        type: attr.keyType
                    }));

                    // 构建字段描述信息并传递给父组件
                    this.buildFieldDescriptions(config, protocolConfig);
                }
            }
        });
    }

    private buildFieldDescriptions(config: any, protocolConfig: ZeekLogType) {
        console.log('构建字段描述信息:', config);
        console.log('协议配置:', protocolConfig);
        const fieldDescriptions: any[] = [];

        // 使用已经构建好的完整属性列表
        this.attributes.forEach(attr => {
            fieldDescriptions.push({
                keyWord: attr.keyWord,
                keyAlias: attr.keyAlias,
                keyType: attr.keyType,
                description: attr.description || '',
                defaultShow: attr.defaultShow || false
            });
        });

        console.log('构建的字段描述信息:', fieldDescriptions);
        // 将字段描述信息设置到父组件
        this.setFieldDescriptions(fieldDescriptions);
    }

    private buildCompleteAttributes(config: any, protocolConfig: ZeekLogType): ZeekLogAttribute[] {
        const allAttributes: ZeekLogAttribute[] = [];

        // 添加通用开始字段 (BeginAttr)
        if (protocolConfig.needBeginAttr && config.BeginAttr) {
            config.BeginAttr.forEach((attr: any) => {
                allAttributes.push({
                    keyWord: attr.keyWord,
                    keyAlias: attr.keyAlias,
                    keyType: attr.keyType,
                    defaultShow: attr.defaultShow || false,
                    description: attr.description
                });
            });
        }

        // 添加协议特定字段
        if (protocolConfig.attribute) {
            protocolConfig.attribute.forEach((attr: any) => {
                allAttributes.push({
                    keyWord: attr.keyWord,
                    keyAlias: attr.keyAlias,
                    keyType: attr.keyType,
                    defaultShow: attr.defaultShow || false,
                    description: attr.description
                });
            });
        }

        // 添加通用结束字段 (EndAttr)
        if (protocolConfig.needEndAttr && config.EndAttr) {
            config.EndAttr.forEach((attr: any) => {
                allAttributes.push({
                    keyWord: attr.keyWord,
                    keyAlias: attr.keyAlias,
                    keyType: attr.keyType,
                    defaultShow: attr.defaultShow || false,
                    description: attr.description
                });
            });
        }

        return allAttributes;
    }

    override ngOnInit() {
        // 需要调用父类初始化以加载资产映射、时间范围订阅等
        super.ngOnInit();
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        if (this.routeParamSubscription) {
            this.routeParamSubscription.unsubscribe();
        }
    }

    protected override processQueryResponse(response: any): void {
        const isIpAlias = (alias: string) => {
            const a = (alias || '').toLowerCase();
            return /(^|\b)(src.*ip|dst.*ip|source.*ip|dest.*ip|id\.orig_h|id\.resp_h|clientip|serverip|ip)$/.test(a);
        };
        const isIpv4Like = (v: any) => typeof v === 'string' && /^(\[?[0-9a-fA-F:]+\]?(:\d+)?)$|^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(v);

        this.rows = (response?.hits || []).map((hit: any) => {
            const row: any = {};
            this.attributes.forEach(attr => {
                let value = hit[attr.keyAlias];
                if (attr.keyType === 'time') {
                    row[attr.keyAlias] = this.formatDate(value);
                } else if (Array.isArray(value)) {
                    row[attr.keyAlias] = value.join(', ');
                } else if (isIpAlias(attr.keyAlias) || isIpv4Like(value)) {
                    row[attr.keyAlias] = this.resolveIpToAsset(value);
                } else {
                    row[attr.keyAlias] = value;
                }
            });
            return row;
        });
        this.total = response?.total || 0;
    }

    truncateText(text: string): string {
        if (!text) return '';
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }
}
