export interface Rule {
  id: number;
  sid: number;
  protocol: string;
  direction: string;
  srcPort: string;
  dstPort: string;
  msg: string;
  classType: string; // maps to classtype in DB
  priority: number;
  cve: string;
  rule: string;      // full snort rule text
  filename: string;
  lastUpdate?: string;
}

export interface RulesPolicy {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  isDefault?: boolean;
  rules: Rule[];
}
