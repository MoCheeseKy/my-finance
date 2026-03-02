import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image');

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Gak ada gambar yang di-upload!' },
        { status: 400 },
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        'API Key belum terbaca sama Next.js. Coba restart server (Ctrl+C lalu npm run dev)',
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Kamu adalah asisten keuangan pintar. Ekstrak daftar pesanan (nama dan harga), tax, dan service dari struk ini.
      
      ATURAN WAJIB:
      1. Keluarkan HANYA dalam format JSON murni.
      2. Harga, tax, dan service harus berupa ANGKA BULAT (integer), hilangkan simbol mata uang dan titik/koma.
      3. Jika tax/service persen (%), ubah jadi nominal. Jika tidak ada, isi 0.
      
      Format JSON HANYA seperti ini:
      {
        "items": [
          { "name": "Ayam Bakar", "price": 25000 }
        ],
        "tax": 2500,
        "service": 0
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: imageFile.type,
        },
      },
    ]);

    const textResponse = result.response.text();

    // Pembersih JSON yang lebih kuat (mengatasi markdown block dari AI)
    let cleanedJson = textResponse;
    const jsonMatch = textResponse.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      cleanedJson = jsonMatch[1];
    }

    cleanedJson = cleanedJson.trim();

    try {
      const parsedData = JSON.parse(cleanedJson);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('Gagal Parsing JSON. Output dari AI:', textResponse);
      throw new Error('AI memberikan format yang salah. Coba foto ulang.');
    }
  } catch (error) {
    console.error('AI Scan Error:', error.message);
    // Sekarang error aslinya bakal dikirim ke frontend
    return NextResponse.json(
      { error: error.message || 'Gagal menghubungi AI.' },
      { status: 500 },
    );
  }
}
