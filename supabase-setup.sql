-- ===== TABEL TAUTAN =====
create table tautan (
  id bigint generated always as identity primary key,
  title text not null,
  url text not null,
  keterangan text,
  views int default 0,
  created_at timestamp default now()
);

-- ===== TABEL PENGUNJUNG (cuma nama, tanpa email) =====
create table pengunjung (
  id bigint generated always as identity primary key,
  nama text not null,
  link text,
  created_at timestamp default now()
);

-- ===== TABEL FOTO (untuk galeri slider) =====
create table foto (
  id bigint generated always as identity primary key,
  url text not null,
  keterangan text,
  urutan int default 0,
  created_at timestamp default now()
);

-- ===== AKTIFKAN ATURAN AKSES =====
alter table tautan enable row level security;
alter table pengunjung enable row level security;
alter table foto enable row level security;

-- siapa saja boleh lihat daftar tautan
create policy "publik lihat tautan" on tautan for select using (true);

-- cuma owner (login) boleh tambah/edit/hapus tautan
create policy "owner tambah tautan" on tautan for insert with check (auth.role() = 'authenticated');
create policy "owner edit tautan" on tautan for update using (auth.role() = 'authenticated');
create policy "owner hapus tautan" on tautan for delete using (auth.role() = 'authenticated');

-- siapa saja boleh isi nama (dicatat sebagai pengunjung)
create policy "publik isi nama" on pengunjung for insert with check (true);

-- siapa saja boleh lihat daftar pengunjung (cuma nama, gak sensitif kayak email)
create policy "publik lihat pengunjung" on pengunjung for select using (true);

-- siapa saja boleh lihat foto galeri
create policy "publik lihat foto" on foto for select using (true);

-- cuma owner (login) boleh tambah/edit/hapus foto
create policy "owner tambah foto" on foto for insert with check (auth.role() = 'authenticated');
create policy "owner edit foto" on foto for update using (auth.role() = 'authenticated');
create policy "owner hapus foto" on foto for delete using (auth.role() = 'authenticated');

create or replace function increment_views(link_id bigint)
returns void
language sql
security definer
as $$
  update tautan set views = views + 1 where id = link_id;
$$;
grant execute on function increment_views(bigint) to anon, authenticated;

create policy "publik lihat file foto-galeri"
on storage.objects for select
using ( bucket_id = 'foto-galeri' );

create policy "owner upload file foto-galeri"
on storage.objects for insert
with check ( bucket_id = 'foto-galeri' and auth.role() = 'authenticated' );

create policy "owner hapus file foto-galeri"
on storage.objects for delete
using ( bucket_id = 'foto-galeri' and auth.role() = 'authenticated' );