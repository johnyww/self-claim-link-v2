export interface Product {
  id: number;
  name: string;
  description?: string;
  download_links: string;
  image_url?: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_id: string;
  product_id: number;
  claim_status: 'claimed' | 'unclaimed';
  claim_timestamp?: string;
  expiration_date?: string;
  one_time_use: boolean;
  created_by?: string;
  created_at: string;
  product?: Product;
}

export interface Settings {
  default_expiration_days: number;
  one_time_use_enabled: boolean;
  admin_username: string;
}

export interface ClaimResponse {
  success: boolean;
  message: string;
  product?: Product;
  download_links?: string[];
}
