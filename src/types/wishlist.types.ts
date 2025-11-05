import { Database } from '@/integrations/supabase/types';

declare module '@/integrations/supabase/types' {
  export interface Database {
    public: {
      Tables: {
        wishlist: {
          Row: {
            id: string;
            user_id: string;
            product_id: string;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            product_id: string;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            product_id?: string;
            created_at?: string;
            updated_at?: string;
          };
          Relationships: [
            {
              foreignKeyName: 'wishlist_user_id_fkey';
              columns: ['user_id'];
              referencedRelation: 'users';
              referencedColumns: ['id'];
            },
            {
              foreignKeyName: 'wishlist_product_id_fkey';
              columns: ['product_id'];
              referencedRelation: 'products';
              referencedColumns: ['id'];
            }
          ];
        };
      };
    };
  }
}
