import localforage from 'localforage';

// Bikin instance database khusus aplikasi kita
export const db = localforage.createInstance({
  name: 'GenZFinance',
  storeName: 'fin_data', // Nama "tabel" penyimpanannya
});

// Fungsi helper buat inisialisasi dummy data kalau app baru pertama kali dibuka
export const initDummyData = async () => {
  const isInitialized = await db.getItem('is_initialized');
};
