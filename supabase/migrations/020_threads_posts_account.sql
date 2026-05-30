-- 한 콘솔에서 2개 Threads 계정 운영: 글이 어느 계정으로 발행될지 기록
-- growthwave(테스트용 카나리아) | onketing(실제 발행처)
-- 토큰 라우팅: publish-threads 가 account 로 THREADS_USER_ID_<ACCOUNT> / THREADS_ACCESS_TOKEN_<ACCOUNT> 선택
alter table threads_posts
  add column if not exists account text default 'growthwave';

-- 기존 행은 테스트 단계이므로 growthwave 로 백필
update threads_posts set account = 'growthwave' where account is null;

comment on column threads_posts.account is
  'Threads 발행 대상 계정: growthwave(테스트) | onketing(실제). 토큰은 THREADS_*_<ACCOUNT> 시크릿에서 라우팅';
