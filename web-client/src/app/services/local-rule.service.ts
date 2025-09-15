import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalRule } from '../pages/threat-management/local-rules/local-rule.interface';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class LocalRuleService {
    private apiUrl = `${environment.apiUrl}/local-rules`;

    constructor(private http: HttpClient) {}

    getAllRules(): Observable<LocalRule[]> {
        return this.http.get<LocalRule[]>(this.apiUrl);
    }

    createRule(rule: any): Observable<any> {
        const payload = {
            ...rule,
            rule_content: rule.rule_content,
            category: rule.category,
            status: rule.status,
            created_date: rule.created_date,
            last_updated: rule.last_updated
        };
        console.log('Creating rule with data:', payload);
        return this.http.post(this.apiUrl, payload);
    }

    updateRule(id: number, rule: LocalRule): Observable<LocalRule> {
        const payload = {
            ...rule,
            rule_content: rule.rule_content,
            category: rule.category,
            status: rule.status,
            last_updated: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
        return this.http.put<LocalRule>(`${this.apiUrl}/${id}`, payload);
    }

    deleteRule(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    testRule(ruleContent: string): Observable<{ success: boolean; message?: string }> {
        const payload = { rule_content: ruleContent };
        return this.http.post<{ success: boolean; message?: string }>(`${this.apiUrl}/test`, payload);
    }
}
