-- Create orders table to persist payments
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  razorpay_signature text,
  amount_paise integer not null,
  currency text not null default 'INR',
  items jsonb not null,
  order_details jsonb,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.orders enable row level security;

-- Policies: users can access only their own orders
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can create their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own orders"
  on public.orders for update
  using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_razorpay_order_id on public.orders(razorpay_order_id);

-- Trigger to keep updated_at fresh
drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
before update on public.orders
for each row execute function public.update_updated_at_column();