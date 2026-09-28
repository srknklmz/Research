-- İmalat takip: şema ve fonksiyonlar.
--
-- Bu dosya santiye-personel Supabase projesine uygulanır. O projedeki diğer
-- tablolara dokunmaz; her şey "imalat_" önekiyle ayrı durur.
--
-- Tarayıcı tablolara doğrudan erişemez (RLS açık, politika yok, yetkiler
-- geri alınmış). Her okuma ve yazma aşağıdaki fonksiyonlardan geçer; her
-- fonksiyon önce oturumu, sonra şantiye yetkisini kontrol eder.

-- ─── Tablolar ─────────────────────────────────────────────────────────────

create table if not exists imalat_santiye (
  id   smallint primary key,
  ad   text not null check (length(trim(ad)) between 1 and 60),
  sira smallint not null default 0
);

-- Giriş hesapları: şantiye başına bir ortak şifre, merkez için bir tane.
-- santiye_id boş olan hesap merkezdir.
create table if not exists imalat_hesap (
  kod         text primary key,
  santiye_id  smallint unique references imalat_santiye(id),
  sifre_ozet  text
);

create table if not exists imalat_oturum (
  token_ozet   text primary key,
  hesap_kod    text not null references imalat_hesap(kod) on delete cascade,
  olusturma    timestamptz not null default now(),
  son_kullanim timestamptz not null default now()
);

create table if not exists imalat_giris_hata (
  id        bigint generated always as identity primary key,
  hesap_kod text not null,
  zaman     timestamptz not null default now()
);
create index if not exists imalat_giris_hata_kod_zaman on imalat_giris_hata (hesap_kod, zaman);

create table if not exists imalat_kalem (
  id           bigint generated always as identity primary key,
  santiye_id   smallint not null references imalat_santiye(id),
  ad           text not null check (length(trim(ad)) between 1 and 200),
  konum        text check (konum is null or length(konum) <= 200),
  ilk_hedef    date,
  hedef        date,
  durum        text not null default 'devam' check (durum in ('devam', 'bitti')),
  bitis        date,
  olusturan_ad text not null,
  olusturma    timestamptz not null default now(),
  check ((durum = 'bitti') = (bitis is not null))
);
create index if not exists imalat_kalem_santiye on imalat_kalem (santiye_id, durum, hedef);

-- Her değişikliğin kaydı. Hiçbir fonksiyon bu tabloyu güncellemez ya da
-- silmez; yalnızca imalatın kendisi silinirse kayıtları da gider.
create table if not exists imalat_degisiklik (
  id          bigint generated always as identity primary key,
  kalem_id    bigint not null references imalat_kalem(id) on delete cascade,
  tur         text not null check (tur in ('olusturma', 'tarih', 'bitti', 'geri_acildi', 'duzenleme')),
  eski_hedef  date,
  yeni_hedef  date,
  neden       text,
  yapan_ad    text not null,
  yapan_hesap text not null,
  zaman       timestamptz not null default now()
);
-- Hedef tarihi henüz belli olmayan imalatta ilk_hedef ve hedef birlikte
-- boştur; ilk verilen tarih ilk hedef olur. (Tablo önceden varsa boşluğa izin ver.)
alter table imalat_kalem alter column ilk_hedef drop not null,
                         alter column hedef drop not null;
do $$ begin
  alter table imalat_kalem add constraint imalat_kalem_tarih_birlikte
    check ((ilk_hedef is null) = (hedef is null));
exception when duplicate_object then null;
end $$;

create index if not exists imalat_degisiklik_kalem on imalat_degisiklik (kalem_id, zaman);
create index if not exists imalat_degisiklik_zaman on imalat_degisiklik (zaman);

alter table imalat_santiye    enable row level security;
alter table imalat_hesap      enable row level security;
alter table imalat_oturum     enable row level security;
alter table imalat_giris_hata enable row level security;
alter table imalat_kalem      enable row level security;
alter table imalat_degisiklik enable row level security;

revoke all on imalat_santiye, imalat_hesap, imalat_oturum, imalat_giris_hata,
              imalat_kalem, imalat_degisiklik
  from anon, authenticated;

insert into imalat_santiye (id, ad, sira) values
  (1, 'Şantiye 1', 1), (2, 'Şantiye 2', 2), (3, 'Şantiye 3', 3)
on conflict (id) do nothing;

insert into imalat_hesap (kod, santiye_id) values
  ('merkez', null), ('s1', 1), ('s2', 2), ('s3', 3)
on conflict (kod) do nothing;

-- ─── İç yardımcılar (dışarıya kapalı) ──────────────────────────────────────

create or replace function imalat__bugun() returns date
language sql stable set search_path = public, extensions as $$
  select (now() at time zone 'Europe/Istanbul')::date
$$;

create or replace function imalat__oturum(
  p_token text, out o_kod text, out o_santiye smallint, out o_merkez boolean
)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ozet text := encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_son  timestamptz;
begin
  select h.kod, h.santiye_id, h.santiye_id is null, o.son_kullanim
    into o_kod, o_santiye, o_merkez, v_son
    from imalat_oturum o join imalat_hesap h on h.kod = o.hesap_kod
   where o.token_ozet = v_ozet
     and o.son_kullanim > now() - interval '60 days';
  if o_kod is null then
    raise exception 'Oturum sona erdi, tekrar giriş yapın.' using errcode = '28000';
  end if;
  if v_son < now() - interval '1 hour' then
    update imalat_oturum set son_kullanim = now() where token_ozet = v_ozet;
  end if;
end $$;

create or replace function imalat__ad(p_ad text) returns text
language plpgsql immutable set search_path = public, extensions as $$
begin
  if p_ad is null or length(trim(p_ad)) < 2 or length(trim(p_ad)) > 60 then
    raise exception 'Adınızı yazın (en az 2 harf).';
  end if;
  return trim(p_ad);
end $$;

-- İmalatı kilitleyip döndürür; oturumun o şantiyeye yetkisi yoksa hata verir.
create or replace function imalat__kalem(p_token text, p_kalem bigint, out o_kalem imalat_kalem, out o_kod text, out o_merkez boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
begin
  select * into s from imalat__oturum(p_token);
  select * into o_kalem from imalat_kalem where id = p_kalem for update;
  if o_kalem.id is null or not (s.o_merkez or o_kalem.santiye_id = s.o_santiye) then
    raise exception 'İmalat bulunamadı.';
  end if;
  o_kod := s.o_kod;
  o_merkez := s.o_merkez;
end $$;

-- ─── Giriş ────────────────────────────────────────────────────────────────

create or replace function imalat_hesaplar() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kod', h.kod,
           'ad', coalesce(s.ad, 'Merkez')
         ) order by h.santiye_id nulls last, s.sira), '[]'::jsonb)
    from imalat_hesap h left join imalat_santiye s on s.id = h.santiye_id
   where h.sifre_ozet is not null
$$;

-- Hatalı denemede hata fırlatmak yerine {hata} döner; böylece deneme kaydı
-- geri alınmaz ve 15 dakikada 8 hatalı denemeden sonra hesap bekletilir.
create or replace function imalat_giris(p_kod text, p_sifre text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ozet  text;
  v_token text;
begin
  if (select count(*) from imalat_giris_hata
       where hesap_kod = p_kod and zaman > now() - interval '15 minutes') >= 8 then
    return jsonb_build_object('hata', 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
  end if;

  select sifre_ozet into v_ozet from imalat_hesap where kod = p_kod;
  if v_ozet is null or crypt(coalesce(p_sifre, ''), v_ozet) <> v_ozet then
    insert into imalat_giris_hata (hesap_kod) values (coalesce(p_kod, ''));
    return jsonb_build_object('hata', 'Şifre yanlış.');
  end if;

  delete from imalat_giris_hata where zaman < now() - interval '1 day';
  delete from imalat_oturum where son_kullanim < now() - interval '60 days';

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into imalat_oturum (token_ozet, hesap_kod)
  values (encode(digest(v_token, 'sha256'), 'hex'), p_kod);
  return jsonb_build_object('token', v_token);
end $$;

create or replace function imalat_cikis(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from imalat_oturum
   where token_ozet = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

-- ─── Okuma ────────────────────────────────────────────────────────────────

create or replace function imalat_veri(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
begin
  select * into s from imalat__oturum(p_token);
  return jsonb_build_object(
    'hesap', jsonb_build_object(
      'kod', s.o_kod,
      'santiye_id', s.o_santiye,
      'merkez', s.o_merkez,
      'ad', coalesce((select ad from imalat_santiye where id = s.o_santiye), 'Merkez')
    ),
    'bugun', imalat__bugun(),
    'santiyeler', (
      select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'ad', x.ad) order by x.sira, x.id), '[]'::jsonb)
        from imalat_santiye x
       where s.o_merkez or x.id = s.o_santiye
    ),
    'kalemler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', k.id,
               'santiye_id', k.santiye_id,
               'ad', k.ad,
               'konum', k.konum,
               'ilk_hedef', k.ilk_hedef,
               'hedef', k.hedef,
               'durum', k.durum,
               'bitis', k.bitis,
               'olusturan_ad', k.olusturan_ad,
               'olusturma', k.olusturma,
               'erteleme', (select count(*) from imalat_degisiklik d where d.kalem_id = k.id and d.tur = 'tarih')
             ) order by k.hedef nulls last, k.id), '[]'::jsonb)
        from imalat_kalem k
       where s.o_merkez or k.santiye_id = s.o_santiye
    ),
    'degisiklikler', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', d.id,
               'kalem_id', d.kalem_id,
               'kalem_ad', k.ad,
               'santiye_id', k.santiye_id,
               'tur', d.tur,
               'eski_hedef', d.eski_hedef,
               'yeni_hedef', d.yeni_hedef,
               'neden', d.neden,
               'yapan_ad', d.yapan_ad,
               'zaman', d.zaman
             ) order by d.zaman desc), '[]'::jsonb)
        from (
          select d.* from imalat_degisiklik d join imalat_kalem k on k.id = d.kalem_id
           where d.zaman > now() - interval '14 days'
             and (s.o_merkez or k.santiye_id = s.o_santiye)
           order by d.zaman desc
           limit 300
        ) d join imalat_kalem k on k.id = d.kalem_id
    )
  );
end $$;

create or replace function imalat_gecmis(p_token text, p_kalem bigint) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
  v_santiye smallint;
begin
  select * into s from imalat__oturum(p_token);
  select santiye_id into v_santiye from imalat_kalem where id = p_kalem;
  if v_santiye is null or not (s.o_merkez or v_santiye = s.o_santiye) then
    raise exception 'İmalat bulunamadı.';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', d.id,
             'tur', d.tur,
             'eski_hedef', d.eski_hedef,
             'yeni_hedef', d.yeni_hedef,
             'neden', d.neden,
             'yapan_ad', d.yapan_ad,
             'zaman', d.zaman
           ) order by d.zaman desc, d.id desc), '[]'::jsonb)
      from imalat_degisiklik d where d.kalem_id = p_kalem
  );
end $$;

-- ─── Yazma ────────────────────────────────────────────────────────────────

create or replace function imalat_ekle(
  p_token text, p_santiye smallint, p_ad text, p_konum text, p_hedef date, p_yapan text
) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
  v_yapan text := imalat__ad(p_yapan);
  v_santiye smallint;
  v_id bigint;
begin
  select * into s from imalat__oturum(p_token);
  v_santiye := case when s.o_merkez then p_santiye else s.o_santiye end;
  if v_santiye is null or not exists (select 1 from imalat_santiye where id = v_santiye) then
    raise exception 'Şantiye seçin.';
  end if;
  if p_ad is null or length(trim(p_ad)) = 0 then
    raise exception 'İmalatın adını yazın.';
  end if;
  if p_hedef is null then
    raise exception 'Hedef bitiş tarihini seçin.';
  end if;

  insert into imalat_kalem (santiye_id, ad, konum, ilk_hedef, hedef, olusturan_ad)
  values (v_santiye, trim(p_ad), nullif(trim(coalesce(p_konum, '')), ''), p_hedef, p_hedef, v_yapan)
  returning id into v_id;

  insert into imalat_degisiklik (kalem_id, tur, yeni_hedef, yapan_ad, yapan_hesap)
  values (v_id, 'olusturma', p_hedef, v_yapan, s.o_kod);
  return v_id;
end $$;

create or replace function imalat_tarih(
  p_token text, p_kalem bigint, p_yeni date, p_neden text, p_yapan text
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v record;
  v_yapan text := imalat__ad(p_yapan);
begin
  select * into v from imalat__kalem(p_token, p_kalem);
  if (v.o_kalem).durum <> 'devam' then
    raise exception 'Bitmiş imalatın tarihi değiştirilemez; önce geri açın.';
  end if;
  if p_yeni is null then
    raise exception 'Yeni hedef tarihini seçin.';
  end if;

  -- Tarihsiz imalata ilk tarih verilmesi erteleme değildir: neden sorulmaz,
  -- tarih ilk hedef olur ve geçmişe düzeltme olarak yazılır.
  if (v.o_kalem).hedef is null then
    update imalat_kalem set hedef = p_yeni, ilk_hedef = p_yeni where id = p_kalem;
    insert into imalat_degisiklik (kalem_id, tur, yeni_hedef, neden, yapan_ad, yapan_hesap)
    values (p_kalem, 'duzenleme', p_yeni, 'Hedef tarih verildi', v_yapan, v.o_kod);
    return;
  end if;

  if p_yeni = (v.o_kalem).hedef then
    raise exception 'Yeni tarih mevcut hedefle aynı.';
  end if;
  if p_neden is null or length(trim(p_neden)) < 3 then
    raise exception 'Tarihin neden değiştiğini kısaca yazın.';
  end if;

  update imalat_kalem set hedef = p_yeni where id = p_kalem;
  insert into imalat_degisiklik (kalem_id, tur, eski_hedef, yeni_hedef, neden, yapan_ad, yapan_hesap)
  values (p_kalem, 'tarih', (v.o_kalem).hedef, p_yeni, left(trim(p_neden), 500), v_yapan, v.o_kod);
end $$;

create or replace function imalat_bitir(
  p_token text, p_kalem bigint, p_bitis date, p_yapan text
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v record;
  v_yapan text := imalat__ad(p_yapan);
  v_bitis date := coalesce(p_bitis, imalat__bugun());
begin
  select * into v from imalat__kalem(p_token, p_kalem);
  if (v.o_kalem).durum <> 'devam' then
    raise exception 'Bu imalat zaten bitmiş.';
  end if;
  if v_bitis > imalat__bugun() then
    raise exception 'Bitiş tarihi bugünden sonra olamaz.';
  end if;

  update imalat_kalem set durum = 'bitti', bitis = v_bitis where id = p_kalem;
  insert into imalat_degisiklik (kalem_id, tur, eski_hedef, yeni_hedef, yapan_ad, yapan_hesap)
  values (p_kalem, 'bitti', (v.o_kalem).hedef, v_bitis, v_yapan, v.o_kod);
end $$;

create or replace function imalat_geri_ac(p_token text, p_kalem bigint, p_yapan text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v record;
  v_yapan text := imalat__ad(p_yapan);
begin
  select * into v from imalat__kalem(p_token, p_kalem);
  if (v.o_kalem).durum <> 'bitti' then
    raise exception 'Bu imalat zaten devam ediyor.';
  end if;

  update imalat_kalem set durum = 'devam', bitis = null where id = p_kalem;
  insert into imalat_degisiklik (kalem_id, tur, eski_hedef, yapan_ad, yapan_hesap)
  values (p_kalem, 'geri_acildi', (v.o_kalem).bitis, v_yapan, v.o_kod);
end $$;

-- Ad ve konum her zaman düzeltilebilir. Hedef tarih yalnızca hiç
-- ertelenmemiş imalatta düzeltilebilir (yanlış girilmiş tarih); o zaman ilk
-- hedef de birlikte değişir. Ertelenmiş imalatta tarih "Tarihi değiştir" ile
-- nedeniyle değişir.
create or replace function imalat_duzenle(
  p_token text, p_kalem bigint, p_ad text, p_konum text, p_hedef date, p_yapan text
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v record;
  v_yapan text := imalat__ad(p_yapan);
  v_hedef date;
begin
  select * into v from imalat__kalem(p_token, p_kalem);
  if p_ad is null or length(trim(p_ad)) = 0 then
    raise exception 'İmalatın adını yazın.';
  end if;

  v_hedef := coalesce(p_hedef, (v.o_kalem).hedef);
  if trim(p_ad) = (v.o_kalem).ad
     and nullif(trim(coalesce(p_konum, '')), '') is not distinct from (v.o_kalem).konum
     and v_hedef is not distinct from (v.o_kalem).hedef then
    return;
  end if;
  if v_hedef is distinct from (v.o_kalem).hedef then
    if exists (select 1 from imalat_degisiklik where kalem_id = p_kalem and tur = 'tarih') then
      raise exception 'Bu imalat ertelenmiş; tarihi "Tarihi değiştir" ile nedeniyle güncelleyin.';
    end if;
    if (v.o_kalem).durum <> 'devam' then
      raise exception 'Bitmiş imalatın tarihi değiştirilemez; önce geri açın.';
    end if;
  end if;

  update imalat_kalem
     set ad = trim(p_ad),
         konum = nullif(trim(coalesce(p_konum, '')), ''),
         hedef = v_hedef,
         ilk_hedef = case when v_hedef is distinct from hedef then v_hedef else ilk_hedef end
   where id = p_kalem;

  insert into imalat_degisiklik (kalem_id, tur, eski_hedef, yeni_hedef, neden, yapan_ad, yapan_hesap)
  values (p_kalem, 'duzenleme',
          case when v_hedef is distinct from (v.o_kalem).hedef then (v.o_kalem).hedef end,
          case when v_hedef is distinct from (v.o_kalem).hedef then v_hedef end,
          'Bilgiler düzeltildi', v_yapan, v.o_kod);
end $$;

-- Merkez her imalatı silebilir; şantiye yalnızca hiç ertelenmemiş kendi
-- imalatını (yanlış girilmiş kayıt) silebilir.
create or replace function imalat_sil(p_token text, p_kalem bigint) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v record;
begin
  select * into v from imalat__kalem(p_token, p_kalem);
  if not v.o_merkez and exists (select 1 from imalat_degisiklik where kalem_id = p_kalem and tur = 'tarih') then
    raise exception 'Ertelenmiş imalatı yalnızca merkez silebilir.';
  end if;
  delete from imalat_kalem where id = p_kalem;
end $$;

-- ─── Merkez ayarları ──────────────────────────────────────────────────────

create or replace function imalat_santiye_ad(p_token text, p_santiye smallint, p_ad text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
begin
  select * into s from imalat__oturum(p_token);
  if not s.o_merkez then
    raise exception 'Bu işlemi yalnızca merkez yapabilir.';
  end if;
  if p_ad is null or length(trim(p_ad)) = 0 or length(trim(p_ad)) > 60 then
    raise exception 'Şantiye adını yazın.';
  end if;
  update imalat_santiye set ad = trim(p_ad) where id = p_santiye;
  if not found then
    raise exception 'Şantiye bulunamadı.';
  end if;
end $$;

-- Şifre değişince o hesabın açık oturumları kapanır.
create or replace function imalat_sifre(p_token text, p_kod text, p_yeni text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
begin
  select * into s from imalat__oturum(p_token);
  if not s.o_merkez then
    raise exception 'Bu işlemi yalnızca merkez yapabilir.';
  end if;
  if p_yeni is null or length(p_yeni) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı.';
  end if;
  update imalat_hesap set sifre_ozet = crypt(p_yeni, gen_salt('bf')) where kod = p_kod;
  if not found then
    raise exception 'Hesap bulunamadı.';
  end if;
  delete from imalat_oturum where hesap_kod = p_kod and p_kod <> s.o_kod;
end $$;

-- ─── Yetkiler ─────────────────────────────────────────────────────────────

revoke all on function imalat__bugun(), imalat__oturum(text), imalat__ad(text),
                       imalat__kalem(text, bigint)
  from public, anon, authenticated;

revoke all on function
  imalat_hesaplar(), imalat_giris(text, text), imalat_cikis(text),
  imalat_veri(text), imalat_gecmis(text, bigint),
  imalat_ekle(text, smallint, text, text, date, text),
  imalat_tarih(text, bigint, date, text, text),
  imalat_bitir(text, bigint, date, text),
  imalat_geri_ac(text, bigint, text),
  imalat_duzenle(text, bigint, text, text, date, text),
  imalat_sil(text, bigint),
  imalat_santiye_ad(text, smallint, text),
  imalat_sifre(text, text, text)
  from public, authenticated;

grant execute on function
  imalat_hesaplar(), imalat_giris(text, text), imalat_cikis(text),
  imalat_veri(text), imalat_gecmis(text, bigint),
  imalat_ekle(text, smallint, text, text, date, text),
  imalat_tarih(text, bigint, date, text, text),
  imalat_bitir(text, bigint, date, text),
  imalat_geri_ac(text, bigint, text),
  imalat_duzenle(text, bigint, text, text, date, text),
  imalat_sil(text, bigint),
  imalat_santiye_ad(text, smallint, text),
  imalat_sifre(text, text, text)
  to anon;
