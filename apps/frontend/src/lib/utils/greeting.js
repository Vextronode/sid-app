// ==========================================
// greeting.js
// Fungsi untuk dapetin sapaan sesuai jam saat ini, dipakai bareng
// di Beranda RT/RW/Warga. Aturan umum waktu Indonesia:
// 05.00-10.59 = Pagi, 11.00-14.59 = Siang, 15.00-17.59 = Sore, sisanya Malam
// ==========================================

export function getGreeting() {
  const jam = new Date().getHours();

  if (jam >= 5 && jam < 11) return 'Selamat Pagi';
  if (jam >= 11 && jam < 15) return 'Selamat Siang';
  if (jam >= 15 && jam < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}