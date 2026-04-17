-- Run this in your Supabase SQL Editor

CREATE TABLE public.mas_chat_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project TEXT NOT NULL,
    type TEXT NOT NULL,
    sender TEXT NOT NULL,
    receiver TEXT,
    text TEXT,
    action_target TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.mas_deliverables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.mas_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mas_deliverables ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for now (since MAS UI uses basic/JWT auth on the Node.js backend, and we will query using the anon key from the Node.js server)
CREATE POLICY "Allow all operations for mas_chat_logs" ON public.mas_chat_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for mas_deliverables" ON public.mas_deliverables FOR ALL USING (true) WITH CHECK (true);
