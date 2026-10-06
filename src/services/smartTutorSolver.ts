/**
 * RemindTask AI Assistant (Bestie Belajar & Teman Ngobrol Santai)
 * Gaya respon: Sangat manusiawi, hangat, gaul, santai, empati, dan 100% nyambung konteks.
 * Bagaikan sahabat karib / Kakak Tingkat (Kating) asik yang selalu nemenin.
 */

interface ChatTurn {
  role: string;
  text: string;
}

export function generateSmartTutorResponse(
  message: string,
  images: any[] = [],
  classContext = '',
  history: ChatTurn[] = []
): string {
  const rawText = (message || '').trim();
  const q = rawText.toLowerCase();

  // Riwayat percakapan untuk deteksi konteks berkelanjutan
  const userTurns = history.filter((h) => h.role === 'user' && h.text && h.text.trim());
  const lastUserTurn = userTurns.length > 0 ? userTurns[userTurns.length - 1].text : '';
  const lastUserLower = lastUserTurn.toLowerCase();
  
  const botTurns = history.filter((h) => h.role === 'model' && h.text && h.text.trim());
  const lastBotTurn = botTurns.length > 0 ? botTurns[botTurns.length - 1].text : '';
  const lastBotLower = lastBotTurn.toLowerCase();

  // Deteksi konteks topik sebelumnya
  const wasTalkingFood = /laper|lapar|makan|minum|kopi|ngopi|mie|indomie|nasgor|jajan|snack|camilan|seblak|boba/i.test(lastUserLower + ' ' + lastBotLower);
  const wasTalkingSleep = /ngantuk|tidur|begadang|istirahat|lelah|merem|melek/i.test(lastUserLower + ' ' + lastBotLower);
  const wasTalkingCoding = /koding|coding|error|bug|javascript|python|html|css|react|function|array/i.test(lastUserLower + ' ' + lastBotLower);
  const wasTalkingMath = /matematika|hitung|rumus|angka|persamaan|aljabar|integral|turunan/i.test(lastUserLower + ' ' + lastBotLower);
  const wasTalkingTasks = /tugas|deadline|makalah|laporan|skripsi|dosen|guru|ujian|kuis|pr/i.test(lastUserLower + ' ' + lastBotLower);
  const wasTalkingEntertainment = /game|film|nonton|anime|musik|lagu|bosen|gabut|rebahan/i.test(lastUserLower + ' ' + lastBotLower);
  const wasTalkingRomance = /crush|gebetan|pacar|doi|cinta|jomblo|galau|bucin/i.test(lastUserLower + ' ' + lastBotLower);

  // 1. Pesan kosong tapi upload foto
  if (!rawText) {
    if (images && images.length > 0) {
      return 'Fotonya udah kuterima dengan jelas ya! 📸 Mau kita bedah langkah penyelesaiannya, cari jawabannya, atau mau dijelasin konsep dasarnya nih? Santai, tinggal kasih tahu aja bagian mana yang paling bikin kamu bingung!';
    }
    return 'Halo! Santai banget nih, ada apa? Mau bahas soal tugas, ngobrolin materi, atau sekadar curhat santai? Tulis aja ya, siap temenin kamu!';
  }

  // 2. Celetukan singkat / Pertanyaan lanjutan kontekstual (Nyambung dengan topik sebelumnya)
  if (q === 'iya' || q === 'ya' || q === 'y' || q === 'yoi' || q === 'bener' || q === 'bener banget' || q === 'betul' || q === 'yup') {
    if (wasTalkingFood) {
      return 'Nah kan! Makanya mending sekarang cari makanan atau jajan dulu gih, jangan disiksa perutnya wkwk. Mau pesen apa nih kira-kira?';
    }
    if (wasTalkingSleep) {
      return 'Nah, daripada maksain melek terus besok pusing pas kelas, mending langsung rebahan dan tidur yang cukup ya. Istirahat itu investasi biar besok gaspol lagi!';
    }
    if (wasTalkingCoding) {
      return 'Sip! Kalo gitu coba kirim potongan kode atau pesan errornya ke sini, biar kita ulik bareng sampai nemu biang kerok bug-nya!';
    }
    if (wasTalkingTasks) {
      return 'Mantap! Mau mulai cicil dari bagian mana dulu nih? Coba kasih tau apa yang paling bikin ganjel biar kita kelarin satu-satu!';
    }
    return 'Sip, asik! Ada hal seru lain yang mau diobrolin atau mau lanjut bahas materi tadi? Santai, gas aja!';
  }

  if (q === 'engga' || q === 'ga' || q === 'gak' || q === 'nggak' || q === 'gamau' || q === 'belum' || q === 'belom') {
    if (wasTalkingFood) {
      return 'Waduh kok belum makan sih? Ntar lemes lho pas nugas wkwk. Minimal siapin camilan atau air putih di meja ya biar tetep on fire!';
    }
    if (wasTalkingSleep) {
      return 'Wkwk masih mau begadang nih ceritanya? Boleh deh, tapi inget jaga kesehatan ya. Jangan lupa minum air putih dan jangan overthinking!';
    }
    return 'Oalah oke santai wkwk. Terus rencanamu gimana nih sekarang? Mau ngobrolin topik lain atau mau refreshing dulu?';
  }

  if (/^(kenapa|knp|kok bisa|maksudnya|maksudnya gimana|gimana caranya|terus|trus|lanjut|contohin dong|gimana tuh)[\s?!.]*$/i.test(q)) {
    if (wasTalkingCoding) {
      return 'Jadi gini logikanya: komputer itu cuma jalanin instruksi yang kita kasih secara urut. Kalo ada satu baris yang salah tipe data atau lupa deklarasi variabel, dia bakal langsung protes alias error. Coba kamu tunjukin kodingannya di sini, biar kita benerin bareng!';
    }
    if (wasTalkingMath) {
      return 'Gini lho alurnya: kuncinya itu di sifat dasar rumusnya. Kita isolasi dulu angka yang mau dicari ke satu sisi, baru kita hitung sisanya. Kalo kamu punya angka soal aslinya, sebutin aja biar langsung kita itung nyata bareng!';
    }
    if (wasTalkingFood) {
      return 'Soalnya kalau nugas pas perut laper, otak kita bakal fokus mikirin makanan terus wkwk! Mending luangkan 15 menit buat makan enak, dijamin mood nugas langsung naik 200%.';
    }
    if (wasTalkingTasks) {
      return 'Maksudnya, jangan langsung liat tugas itu sebagai gunung besar yang bikin males. Pecah jadi 3 tahap: bikin kerangka -> isi konten dasar -> finishing. Gampang kan? Mau mulai dari mana dulu nih?';
    }
    return 'Intinya gini: hal itu terjadi karena ada pola atau sebab-akibatnya. Kalo kamu bayangin di kehidupan sehari-hari, sebenernya sederhana kok. Bagian mana nih yang menurutmu paling bikin rancu? Coba spill!';
  }

  // 3. Sapaan & Pertanyaan "Lagi apa?", "Lagi ngapain?", "Kabarmu gimana?"
  if (/^(lagi apa|lagi ngapain|lagi ngapain lu|lagi ngapain kamu|lagi ngapain nih|lu lagi apa|kabar|apa kabar|gimana kabarmu|gimana kabar)[\s?!.]*$/i.test(q)) {
    return 'Aku lagi standby setia di sini nih nemenin kamu! 😄 Siap bantu bedah tugas kelas, ngobrol santai, atau dengerin curhatan kamu. Kamu sendiri lagi sibuk apa nih sekarang? Lagi santai, pusing nugas, atau lagi rebahan aja?';
  }

  // 4. Bosen / Gabut / Nonton / Game / Hiburan
  if (/\b(bosen|gabut|mager|rebahan|hiburan|nonton|film|movie|anime|drakor|game|main game|mabar|ml|mobile legends|ff|free fire|genshin|valorant|roblox|spotify|lagu|musik)\b/i.test(q)) {
    if (q.includes('game') || q.includes('mabar') || q.includes('ml') || q.includes('valorant') || q.includes('genshin') || q.includes('roblox') || q.includes('ff')) {
      return 'Wih seru banget bahas game! 🎮 Kalau abis pusing nugas seharian emang paling enak mabar bentar buat refreshing otak. Kamu biasanya main apa nih? ML, Valo, Genshin, atau game santai lainnya? Tapi inget ya, jangan sampe keasikan mabar lupa deadline tugas wkwk!';
    }
    if (q.includes('film') || q.includes('anime') || q.includes('nonton') || q.includes('drakor')) {
      return 'Nonton emang pelarian terbaik pas lagi jenuh! 🍿 Kamu sukanya genre apa nih? Action yang bikin melek, romance yang bikin senyum-senyum sendiri, horor, atau anime seru kayak Shingeki no Kyojin / Jujutsu Kaisen? Spill dong tontonan favoritmu!';
    }
    if (q.includes('lagu') || q.includes('musik') || q.includes('spotify')) {
      return 'Setel lagu tuh booster mood paling ampuh pas nugas atau bengong! 🎧 Kamu tipe yang suka denger lagu lofi santai buat fokus, lagu pop galau, atau lagu upbeat yang bikin semangat melek nih?';
    }
    return 'Wkwk emang ada masanya rasa bosen dan gabut itu melanda ya! 🛋️ Mau ngapain nih enaknya? Mau dengerin rekomendasi lagu asik, bahas film/anime seru, atau mau curhat soal kejadian di kampus/sekolah hari ini? Bebas, aku temenin!';
  }

  // 5. Curhat, Percintaan, Doi, Crush, Galau, Teman Kelas
  if (/\b(curhat|galau|crush|gebetan|doi|pacar|mantan|cinta|suka sama|ditembak|naksir|bucin|jomblo|baper|kesepian)\b/i.test(q)) {
    return 'Wah, sesi curhat dibuka nih! ☕ Ceritain aja santai, gak usah sungkan. Kenapa nih sama doi atau crush kamu? Lagi ada tingkah lakunya yang bikin kamu senyum-senyum sendiri, bikin baper, atau malah bikin overthinking? Cerita sini, aku dengerin!';
  }

  // 6. Lapar / Makanan / Minuman / Kopi / Camilan
  if (/\b(laper|lapar|makan|pengen makan|laper nih|makanan|haus|minum|kopi|ngopi|ngemil|camilan|sarapan|maksi|makan siang|makan malam|mie|indomie|nasgor|seblak|bakso|ayam geprek)\b/i.test(q)) {
    if (q.includes('kopi') || q.includes('ngopi')) {
      return 'Wah ngopi tuh emang kombo maut buat nemenin belajar atau nongkrong! ☕ Kamu tim kopi susu gula aren yang creamy manis, atau kopi hitam pait yang auto bikin melek 100% nih? Jangan lupa tetep minum air putih ya biar gak dehidrasi!';
    }
    if (q.includes('mie') || q.includes('indomie') || q.includes('seblak') || q.includes('ayam geprek')) {
      return 'Waduh sebutin menu makanan gurih pedes jam segini auto bikin ngiler wkwk! 🍜 Indomie kuah telor setengah mateng atau ayam geprek emang penyelamat pas nugas. Gih pesen atau masak dulu, biar perut kenyang hati senang!';
    }
    return 'Waduh jam segini perut rawan demo ya! 🤤 Jangan ditahan-tahan lho, nanti asam lambung naik malah makin buyar fokus belajarnya. Mending cari makan dulu gih, mau pesen ojol, masak mie, atau jajan di warung deket rumah? Nanti pas kenyang kita lanjut lagi!';
  }

  // 7. Ngantuk / Tidur / Begadang / Lelah
  if (/\b(ngantuk|tidur|bobok|merem|begadang|kurang tidur|melek|pengen tidur|ketiduran|mata sepet)\b/i.test(q)) {
    return 'Waduh, mata udah 5 watt ya? 🥱 Kalau emang udah lelah banget dan materi udah gak masuk ke otak, mending tidur dulu deh (power nap 20 menit atau langsung istirahat malam). Badan dan otak juga butuh reboot biar gak burnout. Besok pas udah seger, kita lanjut bedah tugasnya bareng!';
  }

  // 8. Capek / Pusing / Stres / Mumet / Males
  if (/\b(capek|cape|lelah|pusing|mumet|males|mager|stres|stress|burnout|penat|muak|berat banget|susah banget)\b/i.test(q)) {
    return 'Wajar banget kok ngerasa capek atau mumet, namanya juga perjuangan nugas dan belajar perkuliahan/sekolah! 🫂 Tarik napas dalem-dalem dulu, rileksin bahu, terus minum air putih. Gak harus semua beres dalam satu malam kok, kita cicil pelan-pelan dari bagian paling gampang ya. Aku temenin di sini, santai aja!';
  }

  // 9. Celetukan Gaul & Reaksi Santai (Woi, Apasih, Lah, Wkwk, Kocak, Anjir, dll)
  if (/^(woi|woyy|oy|oyy|oi|oii|bro|sis|kak|kating|halo kak|halo kating)[\s!.]*$/i.test(q)) {
    return 'Woi juga! Santai, kenapa nih? Lagi ada tugas kuliah/sekolah yang bikin pusing, atau mau ngobrol santai aja seputar materi? Tulis aja, bebas!';
  }

  if (/^(apasih|apaan sih|apaan|apa coba|lah|lah kocak|gajelas|ga jelas|ngaco|apasih wkwk|buset|anjir|bjir|yee)[\s!.]*$/i.test(q)) {
    return 'Wkwkwk santai dong, kenapa nih ketawa atau kaget? Lagi nemu materi/tugas absurd atau lagi ada kejadian kocak di kelas? Spill dong, biar kita bahas bareng!';
  }

  if (/^(wkwk|wkwkwk|haha|hahaha|hehe|hehehe|lol|xixi|kwkwk)[\s!.]*$/i.test(q)) {
    return 'Asik banget ketawanya wkwk! Seneng deh liat kamu tetep ceria walaupun tugas segunung. Ada kabar seru apa nih hari ini?';
  }

  if (/^(makasih|terima kasih|thanks|thank you|thx|kamsahamnida|matur nuwun|danke|tengkyu)[\s!.]*$/i.test(q)) {
    return 'Sama-sama! Seneng banget bisa nemenin dan bantu kamu. Kalo nanti ada soal, kodingan error, materi lain yang bikin pusing, atau sekadar pengen ngobrol, tinggal panggil aku lagi di sini ya. Semangat terus belajarnya! ✨🚀';
  }

  if (/^(tes|test|p|halo|hai|hi|assalamualaikum|pagi|siang|sore|malam)[\s!.]*$/i.test(q)) {
    return 'Halo! Santai banget nih, ada apa? Mau bahas soal tugas, ngobrolin materi, curhat, atau butuh ide project? Tulis aja ya, siap temenin kamu!';
  }

  // 10. Tanya Identitas / Developer RemindTask
  if (
    q.includes('siapa developer') ||
    q.includes('siapa pembuat') ||
    q.includes('siapa yang buat') ||
    q.includes('pembuat remindtask') ||
    q.includes('developer remindtask') ||
    q.includes('yang bikin aplikasi') ||
    q.includes('yang bikin web') ||
    q.includes('owner remindtask') ||
    q.includes('siapa ilham')
  ) {
    return `Halo! Yang membangun dan mengembangkan platform **RemindTask** ini adalah **Ilham** (@ilhamm.18). ✨\n\nIlham membuatnya secara **solo developer** (sendiri tanpa tim) dengan tujuan membantu teman-teman siswa, mahasiswa, dan guru/admin kelas agar punya wadah manajemen tugas dan diskusi yang modern.\n\nRemindTask ini **100% GRATIS**! Kalo kamu mau dukung biaya operasional server dan pengembangan fitur selanjutnya, bisa mampir ke menu **Creator & Donasi** di navbar ya. Terima kasih banyak atas dukungannya! ☕❤️`;
  }

  // 11. Tanya Identitas AI (Siapa kamu / Assistant Kelas)
  if (
    q.includes('siapa kamu') ||
    q.includes('nama kamu siapa') ||
    q.includes('kamu siapa') ||
    q.includes('kamu bot ya') ||
    q.includes('kamu ai apa')
  ) {
    return 'Aku adalah **AI Assistant & Bestie Belajar** kamu di RemindTask! Anggap aja aku kayak teman tongkrongan atau Kakak Tingkat (Kating) asik yang siap nemenin ngerjain tugas, bedah rumus matematika, benerin kodingan error, atau sekadar dengerin keluh kesah perkuliahan/sekolah. Santai, jangan sungkan ngobrol apa aja ya!';
  }

  // 12. Hitungan Aritmatika Langsung (Contoh: "15 * 8", "120 / 4", "5 + 7")
  const mathMatch = rawText.match(/^([0-9.,]+)\s*([\+\-\*\/xX:])\s*([0-9.,]+)$/);
  if (mathMatch) {
    const n1 = parseFloat(mathMatch[1].replace(',', '.'));
    const op = mathMatch[2].toLowerCase();
    const n2 = parseFloat(mathMatch[3].replace(',', '.'));
    let res = 0;
    if (op === '+') res = n1 + n2;
    else if (op === '-') res = n1 - n2;
    else if (op === '*' || op === 'x') res = n1 * n2;
    else if (op === '/' || op === ':') res = n2 !== 0 ? n1 / n2 : 0;
    return `Hasil dari **${n1} ${op} ${n2}** adalah **${res}** ya! 🎉\n\nMantap, ada hitungan atau rumus lanjutannya lagi yang mau kita selesaikan bareng?`;
  }

  // 13. Topik Koding / IT / Pemrograman
  if (
    q.includes('coding') ||
    q.includes('koding') ||
    q.includes('javascript') ||
    q.includes('python') ||
    q.includes('html') ||
    q.includes('css') ||
    q.includes('react') ||
    q.includes('function') ||
    q.includes('loop') ||
    q.includes('array') ||
    q.includes('error') ||
    q.includes('bug')
  ) {
    return `Urusan kodingan emang seru tapi kadang suka bikin puyeng gara-gara satu titik koma atau typo variabel wkwk! 💻\n\nBiar cepet beres, coba salin potongan kode yang error atau sebutin logika apa yang mau kamu bikin. Nanti aku bantu bedah struktur fungsinya dan kasih contoh solusi yang bersih serta langsung jalan!`;
  }

  // 14. Topik Matematika / Rumus
  if (
    q.includes('matematika') ||
    q.includes('aljabar') ||
    q.includes('turunan') ||
    q.includes('integral') ||
    q.includes('pythagoras') ||
    q.includes('persamaan') ||
    q.includes('trigonometri') ||
    q.includes('peluang') ||
    q.includes('pecahan') ||
    q.includes('kalkulus')
  ) {
    return `Materi hitungan dan rumus ini kuncinya jangan dihapal mati, tapi pahami dulu polanya:\n1. Cari variabel apa yang udah diketahui di soal.\n2. Tentukan rumus utama yang menghubungkan variabel itu.\n3. Masukkan angka perlahan dan cek tanda plus/minusnya.\n\nKalo ada angka soal lengkapnya, tulis di sini ya! Nanti kita selesaikan langkah demi langkah! 📐`;
  }

  // 15. Topik Tugas / Kuliah / Sekolah Umum
  if (
    q.includes('tugas') ||
    q.includes('deadline') ||
    q.includes('makalah') ||
    q.includes('laporan') ||
    q.includes('skripsi') ||
    q.includes('revisi') ||
    q.includes('dosen') ||
    q.includes('guru') ||
    q.includes('ujian') ||
    q.includes('pr')
  ) {
    return `Santai, jangan panik dulu sama tugasnya! Kalo lagi banyak deadline numpuk, kuncinya adalah: **bagi tugas jadi beberapa potongan kecil**, terus kerjain yang paling gampang atau paling mepet deadlinenya dulu.\n\nMau mulai dari mana nih? Mau aku bantuin bikin kerangka pembahasannya, cari referensi, atau susun ide pokoknya? Spill aja!`;
  }

  // 16. Default Fallback yang Sangat Luwes, Hangat, & Manusiawi (TIDAK PERNAH KAKU)
  if (lastUserTurn && lastUserTurn.length > 3) {
    return `Wkwk seru juga nih yang kamu ceritain tentang "${rawText}". Pas banget tadi kita juga lagi bahas soal "${lastUserTurn}".\n\nMenurut sudut pandangmu gimana? Ceritain lebih banyak dong, aku penasaran kelanjutannya! 😄`;
  }

  if (q.length <= 20) {
    return `Wkwk santai, ada apa nih tentang "${rawText}"? Ceritain lebih lengkap dong biar obrolan kita makin seru dan nyambung! Aku siap dengerin kok!`;
  }

  return `Menarik banget nih yang kamu omongin tentang "${rawText}"! Biar kita bisa bahas lebih dalem dan seru, coba ceritain lebih detail apa yang lagi ada di pikiranmu atau bagian mana yang mau kita diskusikan bareng. Santai aja, anggap lagi ngobrol sama temen sendiri ya! ✨`;
}
