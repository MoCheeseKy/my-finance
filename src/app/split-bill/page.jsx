'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Copy,
  UserPlus,
  X,
  Utensils,
  Receipt,
  Camera,
  Loader2,
} from 'lucide-react';

export default function FixedSplitBill() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // -- CORE DATA --
  const [members, setMembers] = useState(['Aku', 'Bestie 1']);
  const [items, setItems] = useState([]);

  // -- GLOBAL TAX & SERVICE --
  const [taxConfig, setTaxConfig] = useState({ mode: 'percent', value: 10 });
  const [serviceConfig, setServiceConfig] = useState({
    mode: 'percent',
    value: 5,
  });

  // -- UI MODAL STATE --
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  // -- AI SCAN STATES --
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirmScanModalOpen, setIsConfirmScanModalOpen] = useState(false);
  const [scannedData, setScannedData] = useState({
    items: [],
    tax: 0,
    service: 0,
  });

  // --- LOGIC CALCULATION ---
  const calculation = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0),
      0,
    );
    const taxAmount =
      taxConfig.mode === 'percent'
        ? (subtotal * taxConfig.value) / 100
        : subtotal > 0
          ? Number(taxConfig.value)
          : 0;
    const serviceAmount =
      serviceConfig.mode === 'percent'
        ? (subtotal * serviceConfig.value) / 100
        : subtotal > 0
          ? Number(serviceConfig.value)
          : 0;
    const grandTotal = subtotal + taxAmount + serviceAmount;

    const memberTotals = {};
    members.forEach((m) => (memberTotals[m] = 0));

    const extraRatio =
      subtotal > 0 ? (taxAmount + serviceAmount) / subtotal : 0;

    items.forEach((item) => {
      const price = Number(item.price) || 0;
      if (price > 0 && item.assignedTo.length > 0) {
        const pricePerPerson = price / item.assignedTo.length;
        const finalPricePerPerson =
          pricePerPerson + pricePerPerson * extraRatio;
        item.assignedTo.forEach((m) => {
          if (memberTotals[m] !== undefined)
            memberTotals[m] += finalPricePerPerson;
        });
      }
    });

    return { subtotal, grandTotal, taxAmount, serviceAmount, memberTotals };
  }, [items, members, taxConfig, serviceConfig]);

  // --- ACTIONS ---
  const handleAddNewItem = () => {
    if (!newItemName || !newItemPrice) return;
    setItems([
      ...items,
      {
        id: Date.now(),
        name: newItemName,
        price: Number(newItemPrice),
        assignedTo: [members[0]],
      },
    ]);
    setNewItemName('');
    setNewItemPrice('');
    setIsAddMenuModalOpen(false);
  };

  const handleAddNewMember = () => {
    if (!newMemberName || members.includes(newMemberName.trim())) return;
    setMembers([...members, newMemberName.trim()]);
    setNewMemberName('');
    setIsAddMemberModalOpen(false);
  };

  const toggleAssignment = (itemId, memberName) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const current = item.assignedTo || [];
          const updated = current.includes(memberName)
            ? current.filter((m) => m !== memberName)
            : [...current, memberName];
          return { ...item, assignedTo: updated };
        }
        return item;
      }),
    );
  };

  const copySummary = () => {
    const text = Object.entries(calculation.memberTotals)
      .map(
        ([name, total]) =>
          `${name}: *Rp ${Math.round(total).toLocaleString('id-ID')}*`,
      )
      .join('\n');
    navigator.clipboard.writeText(
      `📌 *Tagihan Nongkrong*\n\n${text}\n\nTotal: Rp ${Math.round(calculation.grandTotal).toLocaleString('id-ID')}\n\nBayar ya ygy! 🙏`,
    );
    alert('Berhasil disalin! 📋');
  };

  // --- AI SCAN LOGIC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Siapkan data AI ke dalam state konfirmasi (kasih ID sementara)
      const parsedItems = (data.items || []).map((item) => ({
        id: Date.now() + Math.random(),
        name: item.name,
        price: item.price,
        assignedTo: [members[0]], // Otomatis assign ke member pertama
      }));

      setScannedData({
        items: parsedItems,
        tax: data.tax || 0,
        service: data.service || 0,
      });

      setIsConfirmScanModalOpen(true);
    } catch (error) {
      alert('Gagal scan bon: ' + error.message);
    } finally {
      setIsScanning(false);
      e.target.value = null; // Reset input file biar bisa upload foto yang sama
    }
  };

  const updateScannedItem = (id, field, value) => {
    setScannedData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const deleteScannedItem = (id) => {
    setScannedData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const confirmScannedData = () => {
    // 1. Masukkan item yang udah diedit ke keranjang utama
    setItems([...items, ...scannedData.items]);

    // 2. Kalau AI nemu Tax/Service nominal, otomatis ganti config global ke Fix (Rp)
    if (scannedData.tax > 0) {
      setTaxConfig({ mode: 'fix', value: scannedData.tax });
    }
    if (scannedData.service > 0) {
      setServiceConfig({ mode: 'fix', value: scannedData.service });
    }

    setIsConfirmScanModalOpen(false);
  };

  // Helper UI buat Global Tax/Service
  const GlobalExtraInput = ({ config, setConfig, label }) => (
    <div className='bg-white p-4 rounded-3xl border border-stone-100 shadow-sm'>
      <div className='flex justify-between items-center mb-2'>
        <label className='text-[10px] font-black text-stone-400 uppercase tracking-widest'>
          {label}
        </label>
        <div className='flex bg-stone-50 p-1 rounded-full text-[9px] font-black border border-stone-100'>
          <button
            onClick={() => setConfig({ ...config, mode: 'percent' })}
            className={`px-2 py-1 rounded-full ${config.mode === 'percent' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400'}`}
          >
            %
          </button>
          <button
            onClick={() => setConfig({ ...config, mode: 'fix' })}
            className={`px-2 py-1 rounded-full ${config.mode === 'fix' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400'}`}
          >
            Rp
          </button>
        </div>
      </div>
      <div className='flex items-center font-bold text-stone-800'>
        <span className='text-xs mr-1 text-stone-400'>
          {config.mode === 'fix' ? 'Rp' : ''}
        </span>
        <input
          type='number'
          value={config.value}
          onChange={(e) =>
            setConfig({ ...config, value: Number(e.target.value) })
          }
          className='w-full bg-transparent outline-none text-sm'
        />
        <span className='text-xs ml-1 text-stone-400'>
          {config.mode === 'percent' ? '%' : ''}
        </span>
      </div>
    </div>
  );

  return (
    <main className='min-h-screen bg-[#FAFAF9] pb-40 relative'>
      <div className='absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-stone-200/50 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        <header className='flex items-center gap-4 mb-8 pt-2'>
          <button
            onClick={() => router.back()}
            className='w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-200'
          >
            <ArrowLeft className='w-5 h-5 text-stone-800' />
          </button>
          <h1 className='text-xl font-black text-stone-800'>Split Bill </h1>
        </header>

        {/* --- SECTION 1: SQUAD --- */}
        <section className='bg-white p-5 rounded-3xl border border-stone-200 shadow-sm mb-6 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center border border-stone-100'>
              <Users className='w-5 h-5 text-stone-600' />
            </div>
            <div>
              <h3 className='font-bold text-stone-800 text-xs'>
                Squad Nongkrong
              </h3>
              <p className='text-[10px] text-stone-400'>
                {members.length} Orang
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className='w-9 h-9 bg-stone-800 rounded-xl flex items-center justify-center text-white shadow-md'
          >
            <UserPlus className='w-4 h-4' />
          </button>
        </section>

        {/* --- SECTION 2: GLOBAL TAX & SERVICE --- */}
        <div className='grid grid-cols-2 gap-3 mb-6'>
          <GlobalExtraInput
            label='Tax PPN'
            config={taxConfig}
            setConfig={setTaxConfig}
          />
          <GlobalExtraInput
            label='Service'
            config={serviceConfig}
            setConfig={setServiceConfig}
          />
        </div>

        {/* --- SECTION 3: MENU DETAIL --- */}
        <section className='mb-8'>
          <div className='flex justify-between items-end mb-4 px-1'>
            <p className='text-[10px] font-black text-stone-400 uppercase tracking-widest'>
              Pesanan ({items.length})
            </p>

            {/* INPUT FILE & TOMBOL SCAN TERSEMBUNYI */}
            <input
              type='file'
              accept='image/*'
              ref={fileInputRef}
              onChange={handleImageUpload}
              className='hidden'
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className='flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-100 transition-all'
            >
              <Camera className='w-3 h-3' /> Auto Scan Bon
            </button>
          </div>

          <div className='space-y-3 max-h-[30vh] overflow-y-auto scrollbar-hide pb-4'>
            {items.length === 0 ? (
              <div className='text-center py-10 bg-white/50 rounded-3xl border border-stone-100 border-dashed'>
                <Utensils className='w-8 h-8 text-stone-200 mx-auto mb-2' />
                <p className='text-[10px] font-bold text-stone-400 uppercase'>
                  Belum ada menu di-input
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className='bg-white p-4 rounded-3xl border border-stone-200 shadow-sm group'
                >
                  <div className='flex justify-between items-start mb-3'>
                    <p className='font-bold text-stone-800 text-sm truncate mr-2'>
                      {item.name}
                    </p>
                    <div className='flex items-center gap-3'>
                      <p className='font-black text-sm text-stone-800'>
                        Rp{item.price.toLocaleString('id-ID')}
                      </p>
                      <button
                        onClick={() =>
                          setItems(items.filter((i) => i.id !== item.id))
                        }
                        className='text-red-300 hover:text-red-500'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {members.map((m) => (
                      <button
                        key={m}
                        onClick={() => toggleAssignment(item.id, m)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${item.assignedTo.includes(m) ? 'bg-stone-800 text-white shadow-sm' : 'bg-stone-50 text-stone-400'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* --- SECTION 4: DARK SUMMARY CARD --- */}
        <section className='bg-stone-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden'>
          <div className='flex justify-between items-start mb-6 relative z-10'>
            <div>
              <h3 className='text-xs font-bold text-stone-400 uppercase tracking-widest mb-1'>
                Hasil Patungan
              </h3>
              <p className='text-[9px] text-stone-500 font-bold uppercase tracking-tighter'>
                Incl. Tax Rp
                {Math.round(calculation.taxAmount).toLocaleString('id-ID')} &
                Serv Rp
                {Math.round(calculation.serviceAmount).toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={copySummary}
              className='w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20'
            >
              <Copy className='w-5 h-5' />
            </button>
          </div>

          <div className='space-y-3 mb-8 max-h-[25vh] overflow-y-auto scrollbar-hide relative z-10'>
            {Object.entries(calculation.memberTotals).map(([name, total]) => (
              <div
                key={name}
                className='flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5'
              >
                <span className='font-bold text-stone-300 text-sm'>{name}</span>
                <span className='font-black text-lg'>
                  Rp{Math.round(total).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>

          <div className='border-t border-stone-700 pt-5 text-center relative z-10'>
            <span className='text-[10px] font-black text-stone-500 uppercase block mb-1'>
              Grand Total
            </span>
            <span className='text-4xl font-black text-white'>
              Rp{Math.round(calculation.grandTotal).toLocaleString('id-ID')}
            </span>
          </div>

          <div className='absolute -bottom-10 -left-10 w-32 h-32 bg-stone-700 rounded-full blur-3xl opacity-50'></div>
        </section>
      </div>

      {/* --- FLOATING ACTION BUTTON --- */}
      <button
        onClick={() => setIsAddMenuModalOpen(true)}
        className='fixed bottom-10 right-8 w-16 h-16 bg-white text-stone-800 rounded-full flex items-center justify-center shadow-[0_15px_40px_rgb(0,0,0,0.2)] border-4 border-[#FAFAF9] hover:scale-110 active:scale-95 transition-all z-40'
      >
        <Plus className='w-8 h-8' strokeWidth={3} />
      </button>

      {/* --- LOADING OVERLAY --- */}
      {isScanning && (
        <div className='fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-900/80 backdrop-blur-sm'>
          <Loader2 className='w-12 h-12 text-blue-400 animate-spin mb-4' />
          <p className='text-white font-bold animate-pulse'>
            AI lagi baca bon kamu...
          </p>
          <p className='text-stone-400 text-xs mt-2'>Tunggu bentar ygy </p>
        </div>
      )}

      {/* --- MODAL KONFIRMASI HASIL SCAN AI --- */}
      {isConfirmScanModalOpen && (
        <div className='fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/60 backdrop-blur-sm p-4'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[85vh] flex flex-col'>
            <div className='flex justify-between items-center mb-6 flex-shrink-0'>
              <div>
                <h3 className='font-black text-xl text-stone-800'>
                  Cek Dulu Boss
                </h3>
                <p className='text-[10px] text-stone-400 font-bold uppercase mt-1'>
                  Bisa diedit kalau AI-nya typo
                </p>
              </div>
              <button
                onClick={() => setIsConfirmScanModalOpen(false)}
                className='w-8 h-8 bg-stone-50 rounded-full flex items-center justify-center text-stone-500'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='overflow-y-auto scrollbar-hide space-y-4 mb-6 flex-1 pr-2'>
              {/* Hasil Items */}
              {scannedData.items.map((item) => (
                <div
                  key={item.id}
                  className='bg-stone-50 p-4 rounded-2xl border border-stone-200 flex gap-3'
                >
                  <div className='flex-1'>
                    <label className='text-[9px] font-black text-stone-400 uppercase block mb-1'>
                      Nama Menu
                    </label>
                    <input
                      type='text'
                      value={item.name}
                      onChange={(e) =>
                        updateScannedItem(item.id, 'name', e.target.value)
                      }
                      className='w-full bg-white border border-stone-200 px-3 py-2 rounded-xl text-sm font-bold outline-none'
                    />
                  </div>
                  <div className='w-1/3'>
                    <label className='text-[9px] font-black text-stone-400 uppercase block mb-1'>
                      Harga (Rp)
                    </label>
                    <input
                      type='number'
                      value={item.price}
                      onChange={(e) =>
                        updateScannedItem(
                          item.id,
                          'price',
                          Number(e.target.value),
                        )
                      }
                      className='w-full bg-white border border-stone-200 px-3 py-2 rounded-xl text-sm font-bold outline-none'
                    />
                  </div>
                  <button
                    onClick={() => deleteScannedItem(item.id)}
                    className='self-end pb-2 text-stone-300 hover:text-red-500'
                  >
                    <Trash2 className='w-5 h-5' />
                  </button>
                </div>
              ))}

              {/* Hasil Extra (Tax & Service) */}
              <div className='grid grid-cols-2 gap-3 pt-4 border-t border-dashed border-stone-200'>
                <div className='bg-stone-50 p-3 rounded-2xl border border-stone-200'>
                  <label className='text-[9px] font-black text-stone-400 uppercase block mb-1'>
                    Tax / PPN (Rp)
                  </label>
                  <input
                    type='number'
                    value={scannedData.tax}
                    onChange={(e) =>
                      setScannedData({
                        ...scannedData,
                        tax: Number(e.target.value),
                      })
                    }
                    className='w-full bg-transparent text-sm font-bold outline-none'
                  />
                </div>
                <div className='bg-stone-50 p-3 rounded-2xl border border-stone-200'>
                  <label className='text-[9px] font-black text-stone-400 uppercase block mb-1'>
                    Service (Rp)
                  </label>
                  <input
                    type='number'
                    value={scannedData.service}
                    onChange={(e) =>
                      setScannedData({
                        ...scannedData,
                        service: Number(e.target.value),
                      })
                    }
                    className='w-full bg-transparent text-sm font-bold outline-none'
                  />
                </div>
              </div>
            </div>

            <button
              onClick={confirmScannedData}
              className='w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 flex-shrink-0'
            >
              Acc & Masukkan Bon <ArrowLeft className='w-5 h-5 rotate-180' />
            </button>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH MENU (MANUAL) */}
      {isAddMenuModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-sm p-4'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>Menu Baru</h3>
              <button
                onClick={() => setIsAddMenuModalOpen(false)}
                className='w-8 h-8 bg-stone-50 rounded-full flex items-center justify-center text-stone-500'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='space-y-4 mb-6'>
              <input
                placeholder='Nama Menu (misal: Iced Matcha)'
                className='w-full bg-stone-50 border border-stone-100 p-4 rounded-2xl font-bold outline-none'
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <div className='relative'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 font-black text-stone-400'>
                  Rp
                </span>
                <input
                  type='number'
                  placeholder='Harga'
                  className='w-full bg-stone-50 border border-stone-100 p-4 pl-10 rounded-2xl font-bold outline-none'
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleAddNewItem}
              className='w-full bg-stone-800 text-white py-4 rounded-2xl font-black shadow-lg'
            >
              Tambahkan
            </button>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SQUAD */}
      {isAddMemberModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-sm p-4'>
          <div className='bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-stone-800'>Ajak Bestie</h3>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className='w-8 h-8 bg-stone-50 rounded-full flex items-center justify-center text-stone-500'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <input
              placeholder='Nama Panggilan'
              className='w-full bg-stone-50 border border-stone-100 p-4 rounded-2xl font-bold outline-none mb-6'
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <button
              onClick={handleAddNewMember}
              className='w-full bg-stone-800 text-white py-4 rounded-2xl font-black shadow-lg'
            >
              Gabung Squad
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
