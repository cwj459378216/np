export interface RuleUpdateConfig {
    id?: number;
    updateMode: string;
    updateUrl?: string;
    updateInterval?: number;
    username?: string;
    password?: string;
    lastUpdateTime?: Date;
    totalRules?: number;
    status?: string;
} 