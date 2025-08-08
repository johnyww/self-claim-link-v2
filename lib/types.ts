export interface Product {
  id: number;
  name: string;
  description?: string;
  download_link: string;
  image_url?: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_id: string;
  claim_status: 'claimed' | 'unclaimed' | 'available';
  claim_timestamp?: string;
  claim_count: number;
  expiration_date?: string;
  one_time_use: boolean;
  created_by?: string;
  created_at: string;
  products?: Product[]; // Added for joined queries
}

export interface OrderProduct {
  id: number;
  order_id: number;
  product_id: number;
  created_at: string;
  product?: Product; // Added for joined queries
}

export interface Settings {
  default_expiration_days: number;
  one_time_use_enabled: boolean;
  admin_username: string;
}

export interface ClaimResponse {
  success: boolean;
  message: string;
  products?: Product[];
  download_links?: string[];
  claim_count?: number;
}
