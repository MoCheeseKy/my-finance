import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Panggil dari environment variable server (Tanpa NEXT_PUBLIC_)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const scanType = formData.get('type'); // 'bon' atau 'mutasi'

    if (!file) {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 400 },
      );
    }

    // Convert file ke format Generative AI (Base64)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    const mimeType = file.type || 'application/pdf'; // Fallback MIME type
    const filePart = {
      inlineData: { data: base64Data, mimeType: mimeType },
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }, // Wajibkan output JSON
    });

    let prompt = '';

    if (scanType === 'bon') {
      prompt = `Kamu adalah asisten keuangan pintar. Baca gambar struk/bon ini. ABAIKAN rincian barang satu per satu. Fokus cari Grand Total harga dan Nama Toko/Merchant. 
      Kembalikan HANYA dalam format JSON array berisi 1 object persis seperti struktur ini: 
      [{"title": "Belanja", "source": "NAMA_TOKO", "amount": "ANGKA_TOTAL_TANPA_TITIK_ATAU_RP", "type": "expense", "category": "pokok"}]`;
    } else {
      prompt = `Kamu adalah asisten keuangan pintar. Baca file mutasi ini. Ekstrak SEMUA transaksi yang ada (uang masuk dan keluar). 
      Kembalikan HANYA dalam format JSON array persis seperti struktur ini: 
      [
        {"title": "Keterangan Singkat", "source": "Nama Pengirim/Penerima", "amount": "ANGKA_TANPA_TITIK", "type": "income", "category": "gaji"},
        {"title": "Keterangan Singkat", "source": "Nama Merchant", "amount": "ANGKA_TANPA_TITIK", "type": "expense", "category": "keinginan"}
      ]
      Pastikan 'type' HANYA bernilai 'income' atau 'expense'.`;
    }

    const result = await model.generateContent([prompt, filePart]);
    const responseText = result.response.text();

    // Kembalikan hasil JSON murni ke Frontend
    return NextResponse.json({ data: JSON.parse(responseText) });
  } catch (error) {
    console.error('API Scan Error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses file' },
      { status: 500 },
    );
  }
}
