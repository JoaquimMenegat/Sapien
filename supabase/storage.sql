-- ============================================================================
-- Sapien — armazenamento de imagens (capas de livros e fotos de perfil)
-- Cole no SQL Editor do Supabase e execute. Pode rodar mais de uma vez.
-- ============================================================================
-- Bucket PÚBLICO: as imagens são exibidas direto em <img src="...">, sem URL
-- assinada (que expiraria). Capas e avatares não são dados sensíveis — o que é
-- protegido é a ESCRITA: cada usuário só grava dentro da própria pasta.
--
-- Convenção de caminho:  {user_id}/covers/{uuid}.jpg
--                        {user_id}/avatars/{uuid}.jpg
-- As policies usam o primeiro nível da pasta para comparar com auth.uid().
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura: qualquer um pode ver as imagens (bucket público).
drop policy if exists "media: leitura publica" on storage.objects;
create policy "media: leitura publica" on storage.objects
  for select using (bucket_id = 'media');

-- Escrita/edição/remoção: só o dono, e só dentro da pasta {auth.uid()}/...
drop policy if exists "media: dono envia" on storage.objects;
create policy "media: dono envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media: dono atualiza" on storage.objects;
create policy "media: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media: dono apaga" on storage.objects;
create policy "media: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
