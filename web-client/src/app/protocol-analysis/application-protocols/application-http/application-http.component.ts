import { Component, OnInit } from '@angular/core';
import { CommonProtocolComponent } from '../common-protocol/common-protocol.component';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { ZeekConfigService } from '../../../services/zeek-config.service';

@Component({
    selector: 'app-application-http',
    template: `
        <app-common-protocol
            protocolName="HTTP"
            indexName="http-realtime"
            [attributes]="attributes">
        </app-common-protocol>
    `,
    standalone: true,
    imports: [CommonProtocolComponent]
})
export class ApplicationHttpComponent implements OnInit {
    attributes: any[] = [];

    constructor(
        private zeekConfigService: ZeekConfigService
    ) {}

    ngOnInit() {
        this.zeekConfigService.getZeekConfig().subscribe({
            next: (config) => {
                const httpProtocol = config.zeek.find(p => p.logName.toLowerCase() === 'http');
                if (httpProtocol) {
                    this.attributes = httpProtocol.attribute;
                }
            }
        });
    }
}
  