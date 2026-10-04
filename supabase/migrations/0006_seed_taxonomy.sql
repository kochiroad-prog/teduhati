-- TEDUHATI — 0006 taxonomy seed
-- Age bands, domains, skills, material tags and the audio catalog, in id + en.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- age bands
-- ---------------------------------------------------------------------------
insert into public.age_bands (code, age_min_months, age_max_months, stage_key, sort_order) values
  ('m00_03', 0,  3,  'bonding',  1),
  ('m03_06', 3,  6,  'bonding',  2),
  ('m06_09', 6,  9,  'explore',  3),
  ('m09_12', 9,  12, 'explore',  4),
  ('m12_18', 12, 18, 'discover', 5),
  ('m18_24', 18, 24, 'discover', 6),
  ('m24_36', 24, 36, 'create',   7),
  ('m36_48', 36, 48, 'learn',    8),
  ('m48_60', 48, 60, 'ready',    9)
on conflict (code) do update
  set age_min_months = excluded.age_min_months,
      age_max_months = excluded.age_max_months,
      stage_key      = excluded.stage_key,
      sort_order     = excluded.sort_order;

insert into public.age_band_translations (age_band_code, locale, name, stage_name, focus) values
  ('m00_03','id','0–3 bulan','Dekat Sejak Awal','Bonding, kontak mata, suara lembut, tummy time singkat'),
  ('m00_03','en','0–3 months','Close From The Start','Bonding, eye contact, soft sounds, short tummy time'),
  ('m03_06','id','3–6 bulan','Dekat Sejak Awal','Sensori, meraih, menanggapi suara, bermain wajah'),
  ('m03_06','en','3–6 months','Close From The Start','Senses, reaching, responding to sound, face play'),
  ('m06_09','id','6–9 bulan','Mulai Menjelajah','Motorik, eksplorasi benda, sebab-akibat sederhana'),
  ('m06_09','en','6–9 months','Starting To Explore','Motor skills, object play, simple cause and effect'),
  ('m09_12','id','9–12 bulan','Mulai Menjelajah','Mobilitas, gestur, giliran, menyelesaikan masalah kecil'),
  ('m09_12','en','9–12 months','Starting To Explore','Moving about, gestures, taking turns, small problems'),
  ('m12_18','id','12–18 bulan','Menemukan Kata','Kosakata, meniru, jalan, kemandirian pertama'),
  ('m12_18','en','12–18 months','Finding Words','Vocabulary, imitation, walking, first independence'),
  ('m18_24','id','18–24 bulan','Menemukan Kata','Bahasa dua kata, pura-pura, rutinitas, koordinasi'),
  ('m18_24','en','18–24 months','Finding Words','Two-word phrases, pretend play, routines, coordination'),
  ('m24_36','id','2–3 tahun','Masa Berkarya','Kalimat, kreativitas, motorik halus, memecahkan masalah'),
  ('m24_36','en','2–3 years','Time To Make','Sentences, creativity, fine motor, problem solving'),
  ('m36_48','id','3–4 tahun','Siap Belajar','Pra-literasi, berhitung awal, pola, mengenali emosi'),
  ('m36_48','en','3–4 years','Ready To Learn','Pre-literacy, early counting, patterns, naming feelings'),
  ('m48_60','id','4–5 tahun','Siap Sekolah','Mengikuti instruksi, huruf dan angka, kerja sama, mandiri'),
  ('m48_60','en','4–5 years','Ready For School','Following instructions, letters and numbers, teamwork')
on conflict (age_band_code, locale) do update
  set name = excluded.name, stage_name = excluded.stage_name, focus = excluded.focus;

-- ---------------------------------------------------------------------------
-- domains
-- Six garden beds; four academic domains fold into the bed they grow out of.
-- ---------------------------------------------------------------------------
insert into public.domains (code, color_token, icon_key, in_garden, sort_order) values
  ('social_emotional', 'terracotta', 'heart',    true,  1),
  ('language',         'sage',       'speech',   true,  2),
  ('cognitive',        'dusty_blue', 'puzzle',   true,  3),
  ('motor',            'yellow',     'steps',    true,  4),
  ('sensory',          'clay',       'touch',    true,  5),
  ('creativity',       'plum',       'brush',    true,  6),
  ('self_care',        'terracotta', 'basket',   false, 7),
  ('early_literacy',   'sage',       'book',     false, 8),
  ('early_numeracy',   'dusty_blue', 'count',    false, 9),
  ('school_readiness', 'dusty_blue', 'backpack', false, 10)
on conflict (code) do update
  set color_token = excluded.color_token,
      icon_key    = excluded.icon_key,
      in_garden   = excluded.in_garden,
      sort_order  = excluded.sort_order;

update public.domains set garden_domain = 'social_emotional' where code = 'self_care';
update public.domains set garden_domain = 'language'         where code = 'early_literacy';
update public.domains set garden_domain = 'cognitive'        where code in ('early_numeracy', 'school_readiness');

-- The self-reference can only be constrained once every domain row exists.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'domains_garden_domain_fkey'
  ) then
    alter table public.domains
      add constraint domains_garden_domain_fkey
      foreign key (garden_domain) references public.domains(code);
  end if;
end $$;

insert into public.domain_translations (domain_code, locale, name, description) values
  ('social_emotional','id','Sosial & Emosi','Kedekatan, menanggapi orang lain, berbagi, menenangkan diri'),
  ('social_emotional','en','Social & Emotional','Closeness, responding to others, sharing, settling down'),
  ('language','id','Bahasa','Menanggapi suara, gestur, kosakata, bercerita'),
  ('language','en','Language','Responding to sound, gestures, vocabulary, telling stories'),
  ('cognitive','id','Berpikir','Perhatian, sebab-akibat, mengelompokkan, memecahkan masalah'),
  ('cognitive','en','Thinking','Attention, cause and effect, sorting, solving problems'),
  ('motor','id','Gerak','Kontrol kepala, meraih, duduk, berjalan, koordinasi tangan'),
  ('motor','en','Movement','Head control, reaching, sitting, walking, hand coordination'),
  ('sensory','id','Sensori','Melihat, mendengar, menyentuh, menjelajahi tekstur'),
  ('sensory','en','Senses','Seeing, hearing, touching, exploring textures'),
  ('creativity','id','Kreativitas','Seni, musik, bermain pura-pura, membuat sesuatu'),
  ('creativity','en','Creativity','Art, music, pretend play, making things'),
  ('self_care','id','Mandiri','Rutinitas, makan sendiri, merapikan, berpakaian'),
  ('self_care','en','Self-care','Routines, feeding themselves, tidying up, dressing'),
  ('early_literacy','id','Pra-Literasi','Buku, bunyi bahasa, huruf, cerita'),
  ('early_literacy','en','Early Literacy','Books, sounds of language, letters, stories'),
  ('early_numeracy','id','Pra-Numerasi','Jumlah, pola, ukuran, bentuk, urutan'),
  ('early_numeracy','en','Early Numeracy','Counting, patterns, size, shape, sequence'),
  ('school_readiness','id','Siap Sekolah','Mengikuti instruksi, fokus, kerja sama, kemandirian'),
  ('school_readiness','en','School Readiness','Following instructions, focus, teamwork, independence')
on conflict (domain_code, locale) do update
  set name = excluded.name, description = excluded.description;

-- ---------------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------------
insert into public.skills (code, domain_code, sort_order) values
  ('bonding',            'social_emotional', 1),
  ('social_response',    'social_emotional', 2),
  ('turn_taking',        'social_emotional', 3),
  ('emotion_naming',     'social_emotional', 4),
  ('cooperation',        'social_emotional', 5),
  ('vocal_response',     'language', 1),
  ('gesture',            'language', 2),
  ('vocabulary',         'language', 3),
  ('conversation',       'language', 4),
  ('storytelling',       'language', 5),
  ('attention',          'cognitive', 1),
  ('cause_effect',       'cognitive', 2),
  ('sorting',            'cognitive', 3),
  ('memory',             'cognitive', 4),
  ('problem_solving',    'cognitive', 5),
  ('head_control',       'motor', 1),
  ('reaching',           'motor', 2),
  ('sitting_crawling',   'motor', 3),
  ('walking_balance',    'motor', 4),
  ('fine_motor',         'motor', 5),
  ('visual_tracking',    'sensory', 1),
  ('auditory',           'sensory', 2),
  ('tactile',            'sensory', 3),
  ('texture_explore',    'sensory', 4),
  ('art_making',         'creativity', 1),
  ('music_movement',     'creativity', 2),
  ('pretend_play',       'creativity', 3),
  ('building',           'creativity', 4),
  ('routine',            'self_care', 1),
  ('self_feeding',       'self_care', 2),
  ('tidying',            'self_care', 3),
  ('dressing',           'self_care', 4),
  ('book_handling',      'early_literacy', 1),
  ('phonological',       'early_literacy', 2),
  ('letter_awareness',   'early_literacy', 3),
  ('counting',           'early_numeracy', 1),
  ('pattern',            'early_numeracy', 2),
  ('shape_size',         'early_numeracy', 3),
  ('number_symbol',      'early_numeracy', 4),
  ('following_steps',    'school_readiness', 1),
  ('focus_persistence',  'school_readiness', 2),
  ('independence',       'school_readiness', 3)
on conflict (code) do update
  set domain_code = excluded.domain_code, sort_order = excluded.sort_order;

insert into public.skill_translations (skill_code, locale, name) values
  ('bonding','id','Kedekatan'),                  ('bonding','en','Bonding'),
  ('social_response','id','Respons sosial'),     ('social_response','en','Social response'),
  ('turn_taking','id','Bergiliran'),             ('turn_taking','en','Taking turns'),
  ('emotion_naming','id','Menamai emosi'),       ('emotion_naming','en','Naming emotions'),
  ('cooperation','id','Kerja sama'),             ('cooperation','en','Cooperation'),
  ('vocal_response','id','Menanggapi suara'),    ('vocal_response','en','Vocal response'),
  ('gesture','id','Gestur'),                     ('gesture','en','Gestures'),
  ('vocabulary','id','Kosakata'),                ('vocabulary','en','Vocabulary'),
  ('conversation','id','Percakapan'),            ('conversation','en','Conversation'),
  ('storytelling','id','Bercerita'),             ('storytelling','en','Storytelling'),
  ('attention','id','Perhatian'),                ('attention','en','Attention'),
  ('cause_effect','id','Sebab-akibat'),          ('cause_effect','en','Cause and effect'),
  ('sorting','id','Mengelompokkan'),             ('sorting','en','Sorting'),
  ('memory','id','Memori'),                      ('memory','en','Memory'),
  ('problem_solving','id','Memecahkan masalah'), ('problem_solving','en','Problem solving'),
  ('head_control','id','Kontrol kepala'),        ('head_control','en','Head control'),
  ('reaching','id','Meraih'),                    ('reaching','en','Reaching'),
  ('sitting_crawling','id','Duduk & merangkak'), ('sitting_crawling','en','Sitting and crawling'),
  ('walking_balance','id','Jalan & keseimbangan'),('walking_balance','en','Walking and balance'),
  ('fine_motor','id','Motorik halus'),           ('fine_motor','en','Fine motor'),
  ('visual_tracking','id','Mengikuti dengan mata'),('visual_tracking','en','Visual tracking'),
  ('auditory','id','Pendengaran'),               ('auditory','en','Listening'),
  ('tactile','id','Sentuhan'),                   ('tactile','en','Touch'),
  ('texture_explore','id','Menjelajah tekstur'), ('texture_explore','en','Exploring texture'),
  ('art_making','id','Berkarya'),                ('art_making','en','Making art'),
  ('music_movement','id','Musik & gerak'),       ('music_movement','en','Music and movement'),
  ('pretend_play','id','Bermain pura-pura'),     ('pretend_play','en','Pretend play'),
  ('building','id','Membangun'),                 ('building','en','Building'),
  ('routine','id','Rutinitas'),                  ('routine','en','Routines'),
  ('self_feeding','id','Makan sendiri'),         ('self_feeding','en','Self-feeding'),
  ('tidying','id','Merapikan'),                  ('tidying','en','Tidying up'),
  ('dressing','id','Berpakaian'),                ('dressing','en','Getting dressed'),
  ('book_handling','id','Memegang buku'),        ('book_handling','en','Handling books'),
  ('phonological','id','Bunyi bahasa'),          ('phonological','en','Sounds of language'),
  ('letter_awareness','id','Mengenal huruf'),    ('letter_awareness','en','Letter awareness'),
  ('counting','id','Berhitung'),                 ('counting','en','Counting'),
  ('pattern','id','Pola'),                       ('pattern','en','Patterns'),
  ('shape_size','id','Bentuk & ukuran'),         ('shape_size','en','Shape and size'),
  ('number_symbol','id','Angka'),                ('number_symbol','en','Numerals'),
  ('following_steps','id','Mengikuti langkah'),  ('following_steps','en','Following steps'),
  ('focus_persistence','id','Fokus & tekun'),    ('focus_persistence','en','Focus and persistence'),
  ('independence','id','Kemandirian'),           ('independence','en','Independence')
on conflict (skill_code, locale) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- material tags
-- is_household = true means almost every Indonesian home already has it, so the
-- recommendation filter can offer "pakai yang ada di rumah" without a shopping list.
-- ---------------------------------------------------------------------------
insert into public.material_tags (code, is_household, sort_order) values
  ('kain',        true,  1),
  ('selimut',     true,  2),
  ('bantal',      true,  3),
  ('sendok',      true,  4),
  ('mangkuk',     true,  5),
  ('gelas_plastik',true, 6),
  ('kardus',      true,  7),
  ('kertas',      true,  8),
  ('krayon',      true,  9),
  ('spidol',      true,  10),
  ('lakban',      true,  11),
  ('botol',       true,  12),
  ('beras',       true,  13),
  ('air',         true,  14),
  ('cermin',      true,  15),
  ('bola',        true,  16),
  ('boneka',      true,  17),
  ('buku',        true,  18),
  ('keranjang',   true,  19),
  ('jepitan',     true,  20),
  ('tali',        true,  21),
  ('balok',       false, 22),
  ('pom_pom',     false, 23),
  ('cat_air',     false, 24),
  ('stiker',      false, 25),
  ('playdough',   false, 26),
  ('kartu_gambar',false, 27),
  ('alat_musik',  false, 28)
on conflict (code) do update
  set is_household = excluded.is_household, sort_order = excluded.sort_order;

insert into public.material_tag_translations (material_tag_code, locale, name) values
  ('kain','id','Kain / lap bersih'),        ('kain','en','Cloth or clean rag'),
  ('selimut','id','Selimut'),               ('selimut','en','Blanket'),
  ('bantal','id','Bantal'),                 ('bantal','en','Pillow'),
  ('sendok','id','Sendok'),                 ('sendok','en','Spoon'),
  ('mangkuk','id','Mangkuk'),               ('mangkuk','en','Bowl'),
  ('gelas_plastik','id','Gelas plastik'),   ('gelas_plastik','en','Plastic cup'),
  ('kardus','id','Kardus'),                 ('kardus','en','Cardboard box'),
  ('kertas','id','Kertas'),                 ('kertas','en','Paper'),
  ('krayon','id','Krayon'),                 ('krayon','en','Crayons'),
  ('spidol','id','Spidol'),                 ('spidol','en','Marker'),
  ('lakban','id','Lakban / selotip'),       ('lakban','en','Tape'),
  ('botol','id','Botol bekas'),             ('botol','en','Empty bottle'),
  ('beras','id','Beras / kacang'),          ('beras','en','Rice or beans'),
  ('air','id','Air'),                       ('air','en','Water'),
  ('cermin','id','Cermin'),                 ('cermin','en','Mirror'),
  ('bola','id','Bola'),                     ('bola','en','Ball'),
  ('boneka','id','Boneka'),                 ('boneka','en','Soft toy'),
  ('buku','id','Buku bergambar'),           ('buku','en','Picture book'),
  ('keranjang','id','Keranjang / wadah'),   ('keranjang','en','Basket or container'),
  ('jepitan','id','Jepitan jemuran'),       ('jepitan','en','Clothes pegs'),
  ('tali','id','Tali / benang'),            ('tali','en','String'),
  ('balok','id','Balok susun'),             ('balok','en','Building blocks'),
  ('pom_pom','id','Pom-pom'),               ('pom_pom','en','Pom-poms'),
  ('cat_air','id','Cat air'),               ('cat_air','en','Watercolour paint'),
  ('stiker','id','Stiker'),                 ('stiker','en','Stickers'),
  ('playdough','id','Playdough'),           ('playdough','en','Playdough'),
  ('kartu_gambar','id','Kartu gambar'),     ('kartu_gambar','en','Picture cards'),
  ('alat_musik','id','Alat musik mainan'),  ('alat_musik','en','Toy instrument')
on conflict (material_tag_code, locale) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- audio catalog
-- Track titles are proper nouns and stay in one form across locales.
-- file_path points at the `audio` storage bucket; license_note is mandatory
-- before any track ships in a paid tier.
-- ---------------------------------------------------------------------------
insert into public.audio_tracks
  (id, kind, mode, title, bpm_min, bpm_max, duration_seconds, instruments, file_path, is_loop, is_premium, license_note, sort_order) values
  ('MUS-001','music','morning','Morning Garden',  75, 90, 60, '{kalimba,soft_piano,acoustic_guitar,ambience}','music/morning/morning-garden.mp3', true, false, 'PENDING: confirm commercial licence before launch', 1),
  ('MUS-002','music','morning','Little Sunshine', 75, 90, 60, '{kalimba,soft_piano,light_percussion}',          'music/morning/little-sunshine.mp3', true, false, 'PENDING: confirm commercial licence before launch', 2),
  ('MUS-003','music','play','Tiny Adventure',     90, 110, 60,'{marimba,ukulele,soft_percussion}',              'music/play/tiny-adventure.mp3', true, false, 'PENDING: confirm commercial licence before launch', 3),
  ('MUS-004','music','play','Let''s Explore',     90, 110, 60,'{marimba,xylophone,ukulele}',                    'music/play/lets-explore.mp3', true, false, 'PENDING: confirm commercial licence before launch', 4),
  ('MUS-005','music','play','Curious Steps',      90, 110, 60,'{xylophone,soft_percussion,ukulele}',            'music/play/curious-steps.mp3', true, true,  'PENDING: confirm commercial licence before launch', 5),
  ('MUS-006','music','bonding','Together',        60, 80, 90, '{piano,acoustic_guitar,soft_strings}',           'music/bonding/together.mp3', true, false, 'PENDING: confirm commercial licence before launch', 6),
  ('MUS-007','music','bonding','Little Moments',  60, 80, 90, '{piano,soft_strings}',                           'music/bonding/little-moments.mp3', true, true, 'PENDING: confirm commercial licence before launch', 7),
  ('MUS-008','music','bedtime','Moonlight',       50, 65, 120,'{felt_piano,music_box,soft_pad}',                'music/bedtime/moonlight.mp3', true, false, 'PENDING: confirm commercial licence before launch', 8),
  ('MUS-009','music','bedtime','Sleepy Cloud',    50, 65, 120,'{felt_piano,soft_pad,gentle_strings}',           'music/bedtime/sleepy-cloud.mp3', true, true, 'PENDING: confirm commercial licence before launch', 9),
  ('MUS-010','music','bedtime','Goodnight Tumi',  50, 65, 120,'{music_box,soft_pad}',                           'music/bedtime/goodnight-tumi.mp3', true, true, 'PENDING: confirm commercial licence before launch', 10)
on conflict (id) do update
  set title = excluded.title, mode = excluded.mode, instruments = excluded.instruments,
      file_path = excluded.file_path, is_premium = excluded.is_premium;

insert into public.audio_tracks (id, kind, title, duration_seconds, file_path, license_note, sort_order) values
  ('SFX-001','sfx','button_pop',   1, 'sfx/button-pop.wav',   'PENDING: confirm commercial licence before launch', 1),
  ('SFX-002','sfx','soft_click',   1, 'sfx/soft-click.wav',   'PENDING: confirm commercial licence before launch', 2),
  ('SFX-003','sfx','complete',     2, 'sfx/complete.wav',     'PENDING: confirm commercial licence before launch', 3),
  ('SFX-004','sfx','success',      2, 'sfx/success.wav',      'PENDING: confirm commercial licence before launch', 4),
  ('SFX-005','sfx','unlock',       2, 'sfx/unlock.wav',       'PENDING: confirm commercial licence before launch', 5),
  ('SFX-006','sfx','level_up',     3, 'sfx/level-up.wav',     'PENDING: confirm commercial licence before launch', 6),
  ('SFX-007','sfx','page_flip',    1, 'sfx/page-flip.wav',    'PENDING: confirm commercial licence before launch', 7),
  ('SFX-008','sfx','tiny_bell',    1, 'sfx/tiny-bell.wav',    'PENDING: confirm commercial licence before launch', 8),
  ('SFX-009','sfx','soft_whoosh',  1, 'sfx/soft-whoosh.wav',  'PENDING: confirm commercial licence before launch', 9),
  ('SFX-010','sfx','sleep_wind',   4, 'sfx/sleep-wind.wav',   'PENDING: confirm commercial licence before launch', 10),
  ('SFX-011','sfx','gentle_boop',  1, 'sfx/gentle-boop.wav',  'PENDING: confirm commercial licence before launch', 11),
  ('SFX-012','sfx','seed_grow',    2, 'sfx/seed-grow.wav',    'PENDING: confirm commercial licence before launch', 12),
  ('SIG-001','signature','teduhati_three_notes', 2, 'sfx/teduhati-signature.wav', 'PENDING: confirm commercial licence before launch', 1)
on conflict (id) do update set title = excluded.title, file_path = excluded.file_path;
