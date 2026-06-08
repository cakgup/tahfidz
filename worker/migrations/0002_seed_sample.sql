-- Sample seed for MVP. Replace with a verified full mushaf import before production.
INSERT OR IGNORE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type) VALUES
(1, 'الفاتحة', 'Al-Fatihah', 7, 'Makkiyah'),
(112, 'الإخلاص', 'Al-Ikhlas', 4, 'Makkiyah'),
(113, 'الفلق', 'Al-Falaq', 5, 'Makkiyah'),
(114, 'الناس', 'An-Nas', 6, 'Makkiyah');

INSERT OR IGNORE INTO ayahs (id, surah_id, ayah_number, juz, text_ar, translation_id, audio_url) VALUES
('1:1',1,1,1,'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ','Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',''),
('1:2',1,2,1,'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ','Segala puji bagi Allah, Tuhan seluruh alam.',''),
('1:3',1,3,1,'الرَّحْمَٰنِ الرَّحِيمِ','Yang Maha Pengasih, Maha Penyayang.',''),
('1:4',1,4,1,'مَالِكِ يَوْمِ الدِّينِ','Pemilik hari pembalasan.',''),
('1:5',1,5,1,'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ','Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami mohon pertolongan.',''),
('1:6',1,6,1,'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ','Tunjukilah kami jalan yang lurus.',''),
('1:7',1,7,1,'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ','Jalan orang-orang yang telah Engkau beri nikmat, bukan jalan mereka yang dimurkai dan bukan pula jalan mereka yang sesat.','');
