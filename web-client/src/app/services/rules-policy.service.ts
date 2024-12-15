import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RulesPolicy, Rule } from '../models/rules-policy.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RulesPolicyService {
  private apiUrl = `${environment.apiUrl}/rules-policy`;

  constructor(private http: HttpClient) {}

  getAllPolicies(): Observable<RulesPolicy[]> {
    return this.http.get<RulesPolicy[]>(this.apiUrl);
  }

  getPolicyById(id: number): Observable<RulesPolicy> {
    return this.http.get<RulesPolicy>(`${this.apiUrl}/${id}`);
  }

  createPolicy(policy: any): Observable<any> {
    const payload = {
        ...policy,
        rules: policy.rules.map((rule: Rule) => ({
            id: rule.id,
            sid: rule.sid,
            protocol: rule.protocol,
            sourceAddress: rule.sourceAddress,
            sourcePort: rule.sourcePort,
            destinationAddress: rule.destinationAddress,
            destinationPort: rule.destinationPort,
            classType: rule.classType,
            cve: rule.cve,
            reference: rule.reference
        }))
    };
    console.log('Creating policy with data:', payload);
    return this.http.post(this.apiUrl, payload);
  }

  updatePolicy(id: number, policy: RulesPolicy): Observable<RulesPolicy> {
    return this.http.put<RulesPolicy>(`${this.apiUrl}/${id}`, policy);
  }

  deletePolicy(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getAllRules(): Observable<Rule[]> {
    return this.http.get<Rule[]>(`${this.apiUrl}/rules`);
  }

  updatePolicyStatus(id: number, enabled: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/status`, { enabled });
  }
} 