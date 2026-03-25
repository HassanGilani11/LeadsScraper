import { supabase } from '@/lib/supabase';

export type AuditActionType = 
  | 'USER_BANNED' 
  | 'USER_UNBANNED' 
  | 'PLAN_CHANGED' 
  | 'PLAN_UPGRADED' 
  | 'IMPERSONATION_START' 
  | 'SETTING_UPDATED' 
  | 'CREDITS_ADDED' 
  | 'USER_INVITED' 
  | 'USER_DELETED'
  | 'PASSWORD_RESET_TRIGGERED'
  | 'FEATURE_FLAG_TOGGLED'
  | 'CAMPAIGN_DELETED'
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_UPDATED'
  | 'CAMPAIGN_STATUS_CHANGED'
  | 'CAMPAIGN_DUPLICATED'
  | 'PROFILE_UPDATED'
  | 'PASSWORD_UPDATED'
  | 'AVATAR_UPDATED'
  | 'DATA_EXTRACTION_SUCCESS';

interface AuditLogParams {
    actionType: AuditActionType;
    targetEntity?: string;
    beforeValue?: any;
    afterValue?: any;
    note?: string;
    metadata?: any;
}

export const logAuditAction = async ({
    actionType,
    targetEntity,
    beforeValue,
    afterValue,
    note,
    metadata = {}
}: AuditLogParams) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to get IP address (optional)
        let ipAddress = 'Unknown';
        try {
            // Use a 2-second timeout for IP fetch to avoid hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            ipAddress = data.ip;
        } catch (e) {
            console.warn('[AuditLog] Failed to fetch IP address:', e);
        }

        const logData = {
            admin_id: user.id,
            action_type: actionType,
            target_entity: targetEntity,
            before_value: beforeValue,
            after_value: afterValue,
            ip_address: ipAddress,
            note: note,
            metadata: {
                ...metadata,
                user_agent: navigator.userAgent,
                category: getCategoryForAction(actionType)
            }
        };

        console.log('[AuditLog] Inserting data:', logData);

        const { error } = await supabase.from('audit_logs').insert(logData);

        if (error) throw error;
    } catch (err) {
        console.error('Failed to log audit action:', err);
    }
};

const getCategoryForAction = (type: AuditActionType): string => {
    if (type.includes('BANNED') || type.includes('DELETED')) return 'moderation';
    if (type.includes('PLAN') || type.includes('CREDITS')) return 'billing';
    if (type.includes('AUTH') || type.includes('IMPERSONATION') || type.includes('PASSWORD')) return 'auth';
    if (type.includes('SETTING') || type.includes('FEATURE') || type.includes('PROFILE')) return 'settings';
    if (type.includes('CAMPAIGN')) return 'campaign';
    if (type.includes('DATA') || type.includes('EXTRACTION')) return 'data';
    return 'system';
};
