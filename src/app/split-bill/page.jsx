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
    <div className='bg-surface p-4 rounded-3xl border border-border shadow-sm transition-colors'>
      <div className='flex justify-between items-center mb-2'>
        <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest'>
          {label}
        </label>
        <div className='flex bg-bg-hover p-1 rounded-full text-[9px] font-black border border-border'>
          <button
            onClick={() => setConfig({ ...config, mode: 'percent' })}
            className={`px-2 py-1 rounded-full transition-colors ${config.mode === 'percent' ? 'bg-primary text-text-primary shadow-sm' : 'text-text-secondary'}`}
          >
            %
          </button>
          <button
            onClick={() => setConfig({ ...config, mode: 'fix' })}
            className={`px-2 py-1 rounded-full transition-colors ${config.mode === 'fix' ? 'bg-primary text-text-primary shadow-sm' : 'text-text-secondary'}`}
          >
            Rp
          </button>
        </div>
      </div>
      <div className='flex items-center font-bold text-text-primary'>
        <span className='text-xs mr-1 text-text-secondary'>
          {config.mode === 'fix' ? 'Rp' : ''}
        </span>
        <input
          type='number'
          value={config.value}
          onChange={(e) =>
            setConfig({ ...config, value: Number(e.target.value) })
          }
          className='w-full bg-transparent outline-none text-sm text-text-primary'
        />
        <span className='text-xs ml-1 text-text-secondary'>
          {config.mode === 'percent' ? '%' : ''}
        </span>
      </div>
    </div>
  );

  return (
    <main className='min-h-screen bg-bg pb-40 relative transition-colors duration-300'>
      <div className='absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-surface/80 to-transparent z-0'></div>

      <div className='relative z-10 p-6 max-w-md mx-auto'>
        <header className='flex items-center gap-4 mb-8 pt-2'>
          <button
            onClick={() => router.back()}
            className='w-10 h-10 bg-surface rounded-2xl flex items-center justify-center shadow-sm border border-border hover:bg-surface-hover transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-text-primary' />
          </button>
          <h1 className='text-xl font-black text-text-primary'>Split Bill </h1>
        </header>

        {/* --- SECTION 1: SQUAD --- */}
        <section className='bg-surface p-5 rounded-3xl border border-border shadow-sm mb-6 flex items-center justify-between transition-colors'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-bg-hover rounded-full flex items-center justify-center border border-border'>
              <Users className='w-5 h-5 text-text-secondary' />
            </div>
            <div>
              <h3 className='font-bold text-text-primary text-xs'>
                Squad Nongkrong
              </h3>
              <p className='text-[10px] text-text-secondary'>
                {members.length} Orang
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className='w-9 h-9 bg-primary text-text-primary rounded-xl flex items-center justify-center shadow-md hover:opacity-90 transition-opacity'
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
            <p className='text-[10px] font-black text-text-secondary uppercase tracking-widest'>
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
              <div className='text-center py-10 bg-surface/50 rounded-3xl border border-border border-dashed'>
                <Utensils className='w-8 h-8 text-text-secondary mx-auto mb-2 opacity-30' />
                <p className='text-[10px] font-bold text-text-secondary uppercase'>
                  Belum ada menu di-input
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className='bg-surface p-4 rounded-3xl border border-border shadow-sm group transition-colors'
                >
                  <div className='flex justify-between items-start mb-3'>
                    <p className='font-bold text-text-primary text-sm truncate mr-2'>
                      {item.name}
                    </p>
                    <div className='flex items-center gap-3'>
                      <p className='font-black text-sm text-text-primary'>
                        Rp{item.price.toLocaleString('id-ID')}
                      </p>
                      <button
                        onClick={() =>
                          setItems(items.filter((i) => i.id !== item.id))
                        }
                        className='text-expense/50 hover:text-expense transition-colors'
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
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${item.assignedTo.includes(m) ? 'bg-primary text-text-primary shadow-sm' : 'bg-bg-hover text-text-secondary'}`}
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
        <section className='bg-surface p-8 rounded-[2.5rem] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-colors'>
          <div className='flex justify-between items-start mb-6 relative z-10'>
            <div>
              <h3 className='text-xs font-bold text-text-secondary uppercase tracking-widest mb-1'>
                Hasil Patungan
              </h3>
              <p className='text-[9px] text-text-secondary font-bold uppercase tracking-tighter'>
                Incl. Tax Rp
                {Math.round(calculation.taxAmount).toLocaleString('id-ID')} &
                Serv Rp
                {Math.round(calculation.serviceAmount).toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={copySummary}
              className='w-10 h-10 bg-bg-hover rounded-xl flex items-center justify-center text-text-primary hover:bg-border transition-colors'
            >
              <Copy className='w-5 h-5' />
            </button>
          </div>

          <div className='space-y-3 mb-8 max-h-[25vh] overflow-y-auto scrollbar-hide relative z-10'>
            {Object.entries(calculation.memberTotals).map(([name, total]) => (
              <div
                key={name}
                className='flex justify-between items-center bg-bg/50 p-4 rounded-2xl border border-border'
              >
                <span className='font-bold text-text-primary text-sm'>
                  {name}
                </span>
                <span className='font-black text-lg text-text-primary'>
                  Rp{Math.round(total).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>

          <div className='border-t border-border pt-5 text-center relative z-10'>
            <span className='text-[10px] font-black text-text-secondary uppercase block mb-1'>
              Grand Total
            </span>
            <span className='text-4xl font-black text-text-primary mb-2 inline-block'>
              Rp{Math.round(calculation.grandTotal).toLocaleString('id-ID')}
            </span>
          </div>

          {/* Decorative background circle */}
          <div className='absolute -bottom-10 -left-10 w-32 h-32 bg-primary-hover/10 rounded-full blur-3xl opacity-50'></div>
        </section>
      </div>

      {/* --- FLOATING ACTION BUTTON --- */}
      <button
        onClick={() => setIsAddMenuModalOpen(true)}
        className='fixed bottom-10 right-8 w-16 h-16 bg-text-primary text-surface rounded-full flex items-center justify-center shadow-[0_15px_40px_rgb(0,0,0,0.2)] border-4 border-surface hover:scale-110 active:scale-95 transition-all z-40'
      >
        <Plus className='w-8 h-8' strokeWidth={3} />
      </button>

      {/* --- LOADING OVERLAY --- */}
      {isScanning && (
        <div className='fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm'>
          <Loader2 className='w-12 h-12 text-primary animate-spin mb-4' />
          <p className='text-text-primary font-bold animate-pulse'>
            AI lagi baca bon kamu...
          </p>
          <p className='text-text-secondary text-xs mt-2'>Tunggu bentar ygy </p>
        </div>
      )}

      {/* --- MODAL KONFIRMASI HASIL SCAN AI --- */}
      {isConfirmScanModalOpen && (
        <div className='fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='bg-surface w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[85vh] flex flex-col border border-border'>
            <div className='flex justify-between items-center mb-6 flex-shrink-0'>
              <div>
                <h3 className='font-black text-xl text-text-primary'>
                  Cek Dulu Boss
                </h3>
                <p className='text-[10px] text-text-secondary font-bold uppercase mt-1'>
                  Bisa diedit kalau AI-nya typo
                </p>
              </div>
              <button
                onClick={() => setIsConfirmScanModalOpen(false)}
                className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary transition-colors hover:bg-border'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='overflow-y-auto scrollbar-hide space-y-4 mb-6 flex-1 pr-2'>
              {/* Hasil Items */}
              {scannedData.items.map((item) => (
                <div
                  key={item.id}
                  className='bg-bg-hover p-4 rounded-2xl border border-border flex gap-3'
                >
                  <div className='flex-1'>
                    <label className='text-[9px] font-black text-text-secondary uppercase block mb-1'>
                      Nama Menu
                    </label>
                    <input
                      type='text'
                      value={item.name}
                      onChange={(e) =>
                        updateScannedItem(item.id, 'name', e.target.value)
                      }
                      className='w-full bg-surface border border-border px-3 py-2 rounded-xl text-sm font-bold outline-none text-text-primary'
                    />
                  </div>
                  <div className='w-1/3'>
                    <label className='text-[9px] font-black text-text-secondary uppercase block mb-1'>
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
                      className='w-full bg-surface border border-border px-3 py-2 rounded-xl text-sm font-bold outline-none text-text-primary'
                    />
                  </div>
                  <button
                    onClick={() => deleteScannedItem(item.id)}
                    className='self-end pb-2 text-expense/50 hover:text-expense transition-colors'
                  >
                    <Trash2 className='w-5 h-5' />
                  </button>
                </div>
              ))}

              {/* Hasil Extra (Tax & Service) */}
              <div className='grid grid-cols-2 gap-3 pt-4 border-t border-dashed border-border'>
                <div className='bg-bg-hover p-3 rounded-2xl border border-border'>
                  <label className='text-[9px] font-black text-text-secondary uppercase block mb-1'>
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
                    className='w-full bg-transparent text-sm font-bold outline-none text-text-primary'
                  />
                </div>
                <div className='bg-bg-hover p-3 rounded-2xl border border-border'>
                  <label className='text-[9px] font-black text-text-secondary uppercase block mb-1'>
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
                    className='w-full bg-transparent text-sm font-bold outline-none text-text-primary'
                  />
                </div>
              </div>
            </div>

            <button
              onClick={confirmScannedData}
              className='w-full bg-primary text-text-primary py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 flex-shrink-0 hover:opacity-90 active:scale-95 transition-all'
            >
              Acc & Masukkan Bon <ArrowLeft className='w-5 h-5 rotate-180' />
            </button>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH MENU (MANUAL) */}
      {isAddMenuModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='bg-surface w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 border border-border'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-text-primary'>
                Menu Baru
              </h3>
              <button
                onClick={() => setIsAddMenuModalOpen(false)}
                className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='space-y-4 mb-6'>
              <input
                placeholder='Nama Menu (misal: Iced Matcha)'
                className='w-full bg-bg border border-border p-4 rounded-2xl font-bold outline-none text-text-primary'
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <div className='relative'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 font-black text-text-secondary'>
                  Rp
                </span>
                <input
                  type='number'
                  placeholder='Harga'
                  className='w-full bg-bg border border-border p-4 pl-10 rounded-2xl font-bold outline-none text-text-primary'
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleAddNewItem}
              className='w-full bg-primary text-text-primary py-4 rounded-2xl font-black shadow-lg hover:opacity-90 active:scale-95 transition-all'
            >
              Tambahkan
            </button>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SQUAD */}
      {isAddMemberModalOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='bg-surface w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 border border-border'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='font-black text-xl text-text-primary'>
                Ajak Bestie
              </h3>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <input
              placeholder='Nama Panggilan'
              className='w-full bg-bg border border-border p-4 rounded-2xl font-bold outline-none mb-6 text-text-primary'
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <button
              onClick={handleAddNewMember}
              className='w-full bg-primary text-text-primary py-4 rounded-2xl font-black shadow-lg hover:opacity-90 active:scale-95 transition-all'
            >
              Gabung Squad
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
