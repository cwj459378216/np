import { Component, Input, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
    selector: 'icon-robot',
    template: `
        <ng-template #template>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" [ngClass]="class">
                <rect x="4" y="7" width="16" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/>
                <rect x="8" y="10" width="3" height="3" rx="1.5" fill="currentColor"/>
                <rect x="13" y="10" width="3" height="3" rx="1.5" fill="currentColor"/>
                <path d="M9 16h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M12 4v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="12" cy="3" r="1" fill="currentColor"/>
                <path d="M4 12H2M22 12h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
            </svg>
        </ng-template>
    `,
})
export class IconRobotComponent {
    @Input() class: any = '';
    @ViewChild('template', { static: true }) template: any;
    constructor(private viewContainerRef: ViewContainerRef) {}
    ngOnInit() {
        this.viewContainerRef.createEmbeddedView(this.template);
        this.viewContainerRef.element.nativeElement.remove();
    }
}


