CREATE TABLE public.account_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_token text NOT NULL,
  tag text NOT NULL CHECK (tag IN ('ramp_up', 'under_performing', 'new_product_launch')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(merchant_token, tag)
);