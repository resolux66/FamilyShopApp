export interface Env {
  DB: D1Database;
  LIST_DO: DurableObjectNamespace;
  RESEND_API_KEY: string;
  SUPERADMIN_KEY: string;
  APP_URL: string;
  CF_ACCESS_TEAM_DOMAIN: string;
}

export interface Variables {
  user: User | null;
  userEmail: string;
}

export interface User {
  id: string;
  family_id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'member';
  invited_by: string | null;
  joined_at: number | null;
  created_at: number;
}

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: number;
}

export interface Invite {
  id: string;
  family_id: string;
  invited_by: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
  expires_at: number;
  created_at: number;
}

export interface AdminInviteCode {
  id: string;
  code: string;
  used_by: string | null;
  used_at: number | null;
  expires_at: number;
  created_at: number;
}

export interface ShoppingList {
  id: string;
  family_id: string;
  created_by: string;
  name: string;
  is_shopping: number;
  shopping_started_by: string | null;
  shopping_started_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface ListItem {
  id: string;
  list_id: string;
  added_by: string;
  name: string;
  quantity: string | null;
  note: string | null;
  is_bought: number;
  bought_by: string | null;
  bought_at: number | null;
  position: number;
  created_at: number;
  updated_at: number;
}
