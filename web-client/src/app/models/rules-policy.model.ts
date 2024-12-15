export interface Rule {
  id: number;
  sid: string;
  protocol: string;
  sourceAddress: string;
  sourcePort: string;
  destinationAddress: string;
  destinationPort: string;
  classType: string;
  cve: string;
  reference: string;
}

export interface RulesPolicy {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  rules: Rule[];
} 