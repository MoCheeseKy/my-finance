import localforage from 'localforage';

// Bikin instance database khusus aplikasi kita
export const db = localforage.createInstance({
  name: 'GenZFinance',
  storeName: 'fin_data', // Nama "tabel" penyimpanannya
});

// Fungsi helper buat inisialisasi dummy data kalau app baru pertama kali dibuka
export const initDummyData = async () => {
  const isInitialized = await db.getItem('is_initialized');
  if (!isInitialized) {
    await db.setItem('balance', 4550000);
    await db.setItem('income', 2100000);
    await db.setItem('expense', 850000);
    await db.setItem('savings', {
      name: 'Macbook Air M3',
      target: 15000000,
      current: 4500000,
    });
    await db.setItem('upcoming_bill', {
      name: 'Spotify Premium',
      amount: 54900,
      daysLeft: 2,
    });
    await db.setItem('is_initialized', true);
  }
};
