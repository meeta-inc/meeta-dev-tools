-- Supabase 마이그레이션: dev_schedules 테이블 생성
-- 실행: Supabase SQL Editor에서 실행

-- ec2_schedules 삭제 (rows=0, 잘못 생성된 테이블)
DROP TABLE IF EXISTS ec2_schedules;

-- dev_schedules 신규 생성
CREATE TABLE dev_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('start', 'stop')),
  days_of_week int[] NOT NULL,
  time_utc time NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Seoul',
  description text,
  is_enabled boolean DEFAULT true,
  created_by text NOT NULL,
  notify_channel_id text,
  last_executed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS 활성화 + 전체 접근 허용 (서비스 키로만 접근)
ALTER TABLE dev_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access" ON dev_schedules FOR ALL USING (true);
