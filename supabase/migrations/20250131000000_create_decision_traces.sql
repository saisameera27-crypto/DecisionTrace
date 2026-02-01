-- decision_traces: stores analysis results for report retrieval
create table if not exists decision_traces (
  id text primary key,
  created_at timestamptz not null default now(),
  filename text not null default '',
  mime_type text not null default '',
  size int not null default 0,
  report_json jsonb not null default '{}'
);

-- Optional: index for listing by created_at
create index if not exists decision_traces_created_at_idx on decision_traces (created_at desc);
