import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuleUpdateConfig } from '../models/rule-update.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RuleUpdateService {
  private apiUrl = environment.apiUrl + '/rule-update';

  constructor(private http: HttpClient) {}

  getCurrentConfig(): Observable<RuleUpdateConfig> {
    console.log('Fetching current config from:', `${this.apiUrl}/config`);
    return this.http.get<RuleUpdateConfig>(`${this.apiUrl}/config`);
  }

  saveConfig(config: RuleUpdateConfig): Observable<void> {
    console.log('Saving config:', config);
    if (config.id) {
      return this.http.put<void>(`${this.apiUrl}/config/${config.id}`, config);
    } else {
      return this.http.post<void>(`${this.apiUrl}/config`, config);
    }
  }

  updateRules(configId: number, totalRules: number): Observable<void> {
    console.log('Updating rules for config:', configId);
    return this.http.post<void>(
      `${this.apiUrl}/update/${configId}`,
      null,
      { params: { totalRules: totalRules.toString() } }
    );
  }

  deleteConfig(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/config/${id}`);
  }
}
