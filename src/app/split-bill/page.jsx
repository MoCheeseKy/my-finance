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
  CheckCircle2,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- FRAMER MOTION VARIANTS ---
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
      type: 'spring',
      damping: 20,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const bottomSheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 25, stiffness: 200 },
  },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
};

export default function FixedSplitBill() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // -- CORE DATA --
  const [members, setMembers] = useState(['Aku']); // Default cuma 'Aku'
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
  const [newItemQty, setNewItemQty] = useState(1);
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
    // Subtotal: Harga Satuan * Qty
    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1),
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
      const rowTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
      if (rowTotal > 0 && item.assignedTo.length > 0) {
        const pricePerPerson = rowTotal / item.assignedTo.length;
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
        qty: Number(newItemQty),
        assignedTo: [members[0]],
      },
    ]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty(1);
    setIsAddMenuModalOpen(false);
  };

  const handleAddNewMember = () => {
    if (!newMemberName || members.includes(newMemberName.trim())) return;
    setMembers([...members, newMemberName.trim()]);
    setNewMemberName('');
    setIsAddMemberModalOpen(false);
  };

  const handleRemoveMember = (nameToRemove) => {
    if (nameToRemove === 'Aku') return; // Cegah hapus diri sendiri
    setMembers(members.filter((m) => m !== nameToRemove));
    setItems(
      items.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((m) => m !== nameToRemove),
      })),
    );
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

  const updateItemQty = (id, delta) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, (item.qty || 1) + delta);
          return { ...item, qty: newQty };
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
      `📌 *Tagihan Nongkrong*\n\n${text}\n\nTotal: Rp ${Math.round(calculation.grandTotal).toLocaleString('id-ID')}\n\nBayar ya ygy! ✨`,
    );

    const btn = document.getElementById('copy-btn');
    if (btn) {
      const originalHtml = btn.innerHTML;
      btn.innerHTML =
        '<svg class="w-5 h-5 text-income" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      setTimeout(() => (btn.innerHTML = originalHtml), 2000);
    }
  };

  // --- AI SCAN LOGIC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/scan', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const parsedItems = (data.items || []).map((item) => ({
        id: Date.now() + Math.random(),
        name: item.name,
        price: item.price,
        qty: item.qty || 1,
        assignedTo: [members[0]],
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
      e.target.value = null;
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

  const updateScannedItemQty = (id, delta) => {
    setScannedData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, (item.qty || 1) + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }),
    }));
  };

  const deleteScannedItem = (id) => {
    setScannedData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const confirmScannedData = () => {
    setItems([...items, ...scannedData.items]);
    if (scannedData.tax > 0)
      setTaxConfig({ mode: 'fix', value: scannedData.tax });
    if (scannedData.service > 0)
      setServiceConfig({ mode: 'fix', value: scannedData.service });
    setIsConfirmScanModalOpen(false);
  };

  // --- HELPER COMPONENT ---
  const GlobalExtraInput = ({ config, setConfig, label, id }) => (
    <div className='bg-surface/80 backdrop-blur-md p-4 rounded-[1.5rem] border border-border shadow-sm transition-colors flex flex-col justify-between'>
      <div className='flex justify-between items-center mb-3'>
        <label className='text-[10px] font-black text-text-secondary uppercase tracking-widest'>
          {label}
        </label>
        <div className='flex bg-bg p-1 rounded-xl text-[10px] font-black border border-border relative'>
          {['percent', 'fix'].map((mode) => (
            <button
              key={mode}
              onClick={() => setConfig({ ...config, mode })}
              className={`relative px-2 py-1 rounded-lg z-10 transition-colors ${config.mode === mode ? 'text-text-primary' : 'text-text-secondary'}`}
            >
              {mode === 'percent' ? '%' : 'Rp'}
              {config.mode === mode && (
                <motion.div
                  layoutId={`toggle-${id}`}
                  className='absolute inset-0 bg-surface rounded-lg -z-10 shadow-sm border border-border'
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className='flex items-center font-black text-text-primary text-xl'>
        {config.mode === 'fix' && (
          <span className='text-sm mr-1.5 text-text-secondary'>Rp</span>
        )}
        <input
          type='number'
          value={config.value}
          onChange={(e) =>
            setConfig({ ...config, value: Number(e.target.value) })
          }
          className='w-full bg-transparent outline-none text-text-primary'
        />
        {config.mode === 'percent' && (
          <span className='text-sm ml-1 text-text-secondary'>%</span>
        )}
      </div>
    </div>
  );

  return (
    <main className='min-h-screen bg-bg pb-28 md:pb-12 md:pl-32 lg:pl-36 relative transition-all duration-500 font-sans'>
      {/* Responsive Background Glow */}
      <div className='absolute top-0 left-0 w-full h-56 lg:h-72 bg-primary/10 rounded-b-[4rem] z-0 blur-3xl opacity-50'></div>

      <motion.div
        variants={pageVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 p-6 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto'
      >
        {/* HEADER */}
        <header className='flex items-center justify-between mb-8 pt-2'>
          <div className='flex items-center gap-4'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className='w-11 h-11 bg-surface/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-border transition-colors group'
            >
              <ArrowLeft className='w-5 h-5 text-text-primary group-hover:text-primary transition-colors' />
            </motion.button>
            <h1 className='text-xl md:text-2xl font-black text-text-primary tracking-tight'>
              Split Bill
            </h1>
          </div>
        </header>

        {/* GRID LAYOUT UNTUK DESKTOP */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10'>
          {/* ========================================================= */}
          {/* KOLOM KIRI (Pengaturan Squad, Pajak, Input Actions)       */}
          {/* ========================================================= */}
          <div className='lg:col-span-5 flex flex-col gap-6'>
            {/* SQUAD */}
            <motion.section
              variants={itemVariants}
              className='bg-surface/80 backdrop-blur-xl p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-border shadow-sm flex items-center justify-between transition-colors'
            >
              <div className='flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1 mr-3'>
                <div className='w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-[1rem] flex items-center justify-center border border-primary/20 flex-shrink-0'>
                  <Users className='w-5 h-5 md:w-6 md:h-6 text-primary' />
                </div>
                <div className='flex gap-2'>
                  <AnimatePresence>
                    {members.map((m) => (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, width: 0 }}
                        key={m}
                        className='pl-3 pr-2 py-1.5 md:py-2 bg-bg border border-border rounded-xl text-[11px] md:text-xs font-bold text-text-primary whitespace-nowrap flex items-center gap-1.5'
                      >
                        <span>{m}</span>
                        {m !== 'Aku' && (
                          <button
                            onClick={() => handleRemoveMember(m)}
                            className='w-4 h-4 md:w-5 md:h-5 bg-surface hover:bg-expense/10 text-text-secondary hover:text-expense rounded-full flex items-center justify-center transition-colors'
                          >
                            <X className='w-2.5 h-2.5 md:w-3 md:h-3' />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className='w-10 h-10 md:w-12 md:h-12 bg-bg border border-dashed border-text-secondary/50 text-text-primary rounded-[1rem] flex items-center justify-center flex-shrink-0 hover:bg-surface-hover hover:border-primary transition-all'
              >
                <UserPlus className='w-4 h-4 md:w-5 md:h-5' />
              </button>
            </motion.section>

            {/* GLOBAL TAX & SERVICE */}
            <motion.div
              variants={itemVariants}
              className='grid grid-cols-2 gap-3 md:gap-4'
            >
              <GlobalExtraInput
                id='tax'
                label='Tax PPN'
                config={taxConfig}
                setConfig={setTaxConfig}
              />
              <GlobalExtraInput
                id='srv'
                label='Service'
                config={serviceConfig}
                setConfig={setServiceConfig}
              />
            </motion.div>

            {/* ACTION ROW (Scan Bon / Input Manual) */}
            <motion.div
              variants={itemVariants}
              className='grid grid-cols-2 gap-3 mt-2'
            >
              <input
                type='file'
                accept='image/*'
                ref={fileInputRef}
                onChange={handleImageUpload}
                className='hidden'
              />
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className='bg-investment/10 border border-investment/20 text-investment p-4 md:p-5 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-2 hover:bg-investment/20 transition-colors shadow-sm'
              >
                <Camera className='w-5 h-5' /> Auto Scan Bon
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddMenuModalOpen(true)}
                className='bg-surface border border-border text-text-primary p-4 md:p-5 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-2 hover:border-primary/50 transition-colors shadow-sm'
              >
                <Plus className='w-5 h-5 text-primary' /> Input Manual
              </motion.button>
            </motion.div>
          </div>

          {/* ========================================================= */}
          {/* KOLOM KANAN (Daftar Menu & Hasil Receipt)                 */}
          {/* ========================================================= */}
          <div className='lg:col-span-7 flex flex-col gap-6'>
            {/* DAFTAR MENU (KERANJANG) */}
            <motion.section
              variants={itemVariants}
              className='bg-surface/50 border border-border rounded-[2.5rem] p-4 md:p-6 shadow-sm'
            >
              <div className='flex justify-between items-end mb-4 px-1'>
                <h3 className='text-xs md:text-sm font-black text-text-secondary uppercase tracking-widest'>
                  Pesanan ({items.length})
                </h3>
              </div>

              <div className='space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pb-2'>
                <AnimatePresence mode='popLayout'>
                  {items.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className='text-center py-10 md:py-16 bg-surface rounded-[2rem] border border-border border-dashed'
                    >
                      <Utensils className='w-10 h-10 md:w-12 md:h-12 text-text-secondary/30 mx-auto mb-3' />
                      <p className='text-xs md:text-sm font-bold text-text-secondary'>
                        Belum ada pesanan di-input
                      </p>
                    </motion.div>
                  ) : (
                    items.map((item) => {
                      const rowTotal = (item.price || 0) * (item.qty || 1);
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={item.id}
                          className='bg-surface/90 backdrop-blur-md p-4 md:p-5 rounded-[1.5rem] border border-border shadow-sm group transition-colors'
                        >
                          <div className='flex justify-between items-start mb-4 gap-2'>
                            <div className='flex-1 min-w-0'>
                              <p className='font-bold text-text-primary text-[15px] md:text-base truncate leading-tight mb-1'>
                                {item.name}
                              </p>
                              <p className='text-[10px] md:text-[11px] font-bold text-text-secondary tracking-widest'>
                                @ Rp{item.price.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div className='flex flex-col items-end gap-2'>
                              <p className='font-black text-[15px] md:text-base text-text-primary'>
                                Rp{rowTotal.toLocaleString('id-ID')}
                              </p>
                              <div className='flex items-center gap-2'>
                                <div className='flex items-center bg-bg rounded-lg border border-border'>
                                  <button
                                    onClick={() => updateItemQty(item.id, -1)}
                                    className='p-1.5 text-text-secondary hover:text-expense transition-colors'
                                  >
                                    <Minus className='w-3 h-3 md:w-3.5 md:h-3.5' />
                                  </button>
                                  <span className='text-xs md:text-sm font-black w-5 md:w-6 text-center'>
                                    {item.qty || 1}
                                  </span>
                                  <button
                                    onClick={() => updateItemQty(item.id, 1)}
                                    className='p-1.5 text-text-secondary hover:text-primary transition-colors'
                                  >
                                    <Plus className='w-3 h-3 md:w-3.5 md:h-3.5' />
                                  </button>
                                </div>
                                <button
                                  onClick={() =>
                                    setItems(
                                      items.filter((i) => i.id !== item.id),
                                    )
                                  }
                                  className='text-expense/40 hover:text-expense transition-colors ml-1 p-1'
                                >
                                  <Trash2 className='w-4 h-4 md:w-5 md:h-5' />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className='flex flex-wrap gap-1.5 pt-2 border-t border-border/50'>
                            {members.map((m) => {
                              const isSelected = item.assignedTo.includes(m);
                              return (
                                <button
                                  key={m}
                                  onClick={() => toggleAssignment(item.id, m)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] md:text-[11px] font-black tracking-wider transition-all border ${isSelected ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-bg text-text-secondary border-border hover:border-text-secondary/50'}`}
                                >
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </motion.section>

            {/* RECEIPT / HASIL PATUNGAN */}
            <motion.section
              variants={itemVariants}
              className='bg-gradient-to-br from-surface to-surface/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-border shadow-[0_15px_40px_rgb(0,0,0,0.05)] relative overflow-hidden transition-colors'
            >
              <div
                className='absolute top-0 left-0 w-full h-2 bg-transparent'
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 10px 0, transparent 10px, var(--surface) 11px)',
                  backgroundSize: '20px 20px',
                  backgroundRepeat: 'repeat-x',
                }}
              ></div>

              <div className='flex justify-between items-start mb-6 relative z-10 pt-2'>
                <div>
                  <h3 className='text-xs md:text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2 mb-1'>
                    <Receipt className='w-4 h-4 md:w-5 md:h-5 text-primary' />{' '}
                    Struk Patungan
                  </h3>
                  <p className='text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-tighter'>
                    Incl. Tax Rp
                    {Math.round(calculation.taxAmount).toLocaleString('id-ID')}{' '}
                    & Serv Rp
                    {Math.round(calculation.serviceAmount).toLocaleString(
                      'id-ID',
                    )}
                  </p>
                </div>
                <button
                  id='copy-btn'
                  onClick={copySummary}
                  className='w-10 h-10 md:w-12 md:h-12 bg-bg-hover rounded-[1rem] flex items-center justify-center text-text-primary hover:bg-primary/20 hover:text-primary transition-colors border border-border shadow-sm'
                  title='Salin rincian'
                >
                  <Copy className='w-4 h-4 md:w-5 md:h-5' />
                </button>
              </div>

              <div className='space-y-3 mb-8 relative z-10'>
                {Object.entries(calculation.memberTotals).map(
                  ([name, total]) => (
                    <div
                      key={name}
                      className='flex justify-between items-center border-b border-dashed border-border/60 pb-3'
                    >
                      <span className='font-bold text-text-secondary text-sm md:text-base'>
                        {name}
                      </span>
                      <span className='font-black text-base md:text-lg text-text-primary'>
                        Rp {Math.round(total).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ),
                )}
              </div>

              <div className='bg-bg p-5 md:p-6 rounded-3xl text-center relative z-10 border border-border'>
                <span className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                  Grand Total
                </span>
                <span className='text-4xl md:text-5xl font-black text-text-primary tracking-tight'>
                  Rp{' '}
                  {Math.round(calculation.grandTotal).toLocaleString('id-ID')}
                </span>
              </div>

              <div className='absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none'></div>
            </motion.section>
          </div>
        </div>
      </motion.div>

      {/* --- LOADING OVERLAY --- */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg/80 backdrop-blur-sm'
          >
            <div className='bg-surface p-6 rounded-[2rem] shadow-2xl flex flex-col items-center border border-border'>
              <Loader2 className='w-10 h-10 text-primary animate-spin mb-4' />
              <p className='text-text-primary font-black text-lg animate-pulse mb-1'>
                Membaca Bon...
              </p>
              <p className='text-text-secondary text-xs font-bold uppercase tracking-widest'>
                AI sedang bekerja ✨
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL KONFIRMASI HASIL SCAN AI (BOTTOM SHEET - WIDER ON DESKTOP) --- */}
      <AnimatePresence>
        {isConfirmScanModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface w-full max-w-md md:max-w-2xl lg:max-w-4xl rounded-t-[2.5rem] md:rounded-t-[3rem] p-6 shadow-2xl max-h-[90vh] flex flex-col border-t border-border mx-auto'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6 flex-shrink-0'></div>
              <div className='flex justify-between items-center mb-6 flex-shrink-0'>
                <div>
                  <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                    <CheckCircle2 className='w-6 h-6 text-primary' /> Cek Hasil
                    Scan
                  </h3>
                  <p className='text-[10px] md:text-xs text-text-secondary font-bold uppercase mt-1 tracking-widest'>
                    Bisa diedit kalau AI-nya typo
                  </p>
                </div>
                <button
                  onClick={() => setIsConfirmScanModalOpen(false)}
                  className='w-8 h-8 md:w-10 md:h-10 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary transition-colors hover:bg-border'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='overflow-y-auto scrollbar-hide space-y-4 mb-6 flex-1 px-1'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {scannedData.items.map((item) => (
                    <div
                      key={item.id}
                      className='bg-bg/50 p-4 rounded-[1.5rem] border border-border flex flex-col gap-3 relative group'
                    >
                      <button
                        onClick={() => deleteScannedItem(item.id)}
                        className='absolute top-3 right-3 w-8 h-8 bg-expense/10 rounded-xl flex items-center justify-center text-expense hover:bg-expense/20 transition-colors z-10'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>

                      <div className='bg-surface p-3 rounded-[1.2rem] border border-border focus-within:border-primary w-[85%]'>
                        <label className='text-[9px] font-black text-text-secondary uppercase block mb-1'>
                          Nama Menu
                        </label>
                        <input
                          type='text'
                          value={item.name}
                          onChange={(e) =>
                            updateScannedItem(item.id, 'name', e.target.value)
                          }
                          className='w-full bg-transparent text-sm font-bold outline-none text-text-primary'
                        />
                      </div>

                      <div className='flex gap-3'>
                        <div className='w-[40%] bg-surface p-3 rounded-[1.2rem] border border-border focus-within:border-primary flex items-center justify-between'>
                          <button
                            onClick={() => updateScannedItemQty(item.id, -1)}
                            className='p-1 text-text-secondary hover:text-expense'
                          >
                            <Minus className='w-3 h-3' />
                          </button>
                          <span className='font-black text-sm text-text-primary'>
                            {item.qty || 1}
                          </span>
                          <button
                            onClick={() => updateScannedItemQty(item.id, 1)}
                            className='p-1 text-text-secondary hover:text-primary'
                          >
                            <Plus className='w-3 h-3' />
                          </button>
                        </div>
                        <div className='flex-1 bg-surface p-3 rounded-[1.2rem] border border-border focus-within:border-primary flex items-center'>
                          <span className='text-text-secondary font-black mr-2 text-sm'>
                            Rp
                          </span>
                          <div className='w-full'>
                            <label className='text-[9px] font-black text-text-secondary uppercase block mb-1'>
                              Harga Satuan
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
                              className='w-full bg-transparent text-sm font-black outline-none text-text-primary'
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hasil Extra (Tax & Service) */}
                <div className='grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-dashed border-border'>
                  <div className='bg-surface p-4 rounded-[1.5rem] border border-border focus-within:border-primary'>
                    <label className='text-[9px] md:text-[10px] font-black text-text-secondary uppercase block mb-1'>
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
                  <div className='bg-surface p-4 rounded-[1.5rem] border border-border focus-within:border-primary'>
                    <label className='text-[9px] md:text-[10px] font-black text-text-secondary uppercase block mb-1'>
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

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmScannedData}
                className='w-full md:w-auto md:px-10 md:mx-auto bg-primary text-surface py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black shadow-lg flex items-center justify-center gap-2 flex-shrink-0 border border-white/20 text-lg'
              >
                Acc & Masukkan Bon{' '}
                <ArrowLeft className='w-5 h-5 md:w-6 md:h-6 rotate-180' />
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL TAMBAH MENU MANUAL (BOTTOM SHEET) */}
      <AnimatePresence>
        {isAddMenuModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
              onClick={() => setIsAddMenuModalOpen(false)}
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface w-full max-w-md md:max-w-lg rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  <Utensils className='w-6 h-6 text-primary' /> Menu Baru
                </h3>
                <button
                  onClick={() => setIsAddMenuModalOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='space-y-4 mb-6'>
                <div className='bg-bg/50 p-4 md:p-5 rounded-[1.5rem] border border-border focus-within:border-primary transition-colors'>
                  <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                    Nama Pesanan
                  </label>
                  <input
                    type='text'
                    placeholder='Misal: Iced Matcha'
                    className='w-full bg-transparent font-bold outline-none text-text-primary text-sm md:text-base'
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                </div>
                <div className='flex gap-3'>
                  <div className='bg-bg/50 p-4 md:p-5 rounded-[1.5rem] border border-border focus-within:border-primary transition-colors flex items-center justify-between w-[40%]'>
                    <button
                      onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))}
                      className='text-text-secondary hover:text-expense'
                    >
                      <Minus className='w-4 h-4 md:w-5 md:h-5' />
                    </button>
                    <span className='font-black text-lg md:text-xl text-text-primary'>
                      {newItemQty}
                    </span>
                    <button
                      onClick={() => setNewItemQty(newItemQty + 1)}
                      className='text-text-secondary hover:text-primary'
                    >
                      <Plus className='w-4 h-4 md:w-5 md:h-5' />
                    </button>
                  </div>
                  <div className='flex-1 bg-bg/50 p-4 md:p-5 rounded-[1.5rem] border border-border focus-within:border-primary transition-colors flex items-center'>
                    <span className='text-xl md:text-2xl font-black text-text-secondary mr-3'>
                      Rp
                    </span>
                    <div className='w-full'>
                      <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                        Harga Satuan
                      </label>
                      <input
                        type='number'
                        placeholder='0'
                        className='w-full bg-transparent font-black text-lg md:text-xl outline-none text-text-primary'
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddNewItem}
                className='w-full bg-primary text-surface py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black shadow-lg text-lg'
              >
                Tambahkan
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL TAMBAH SQUAD (BOTTOM SHEET) */}
      <AnimatePresence>
        {isAddMemberModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm'
              onClick={() => setIsAddMemberModalOpen(false)}
            />
            <motion.div
              variants={bottomSheetVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='fixed inset-x-0 bottom-0 z-[70] bg-surface w-full max-w-md md:max-w-lg rounded-t-[2.5rem] p-6 shadow-2xl border-t border-border mx-auto flex flex-col'
            >
              <div className='w-12 h-1.5 bg-border rounded-full mx-auto mb-6'></div>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-xl md:text-2xl text-text-primary flex items-center gap-2'>
                  <UserPlus className='w-6 h-6 text-primary' /> Ajak Bestie
                </h3>
                <button
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className='w-8 h-8 bg-bg-hover rounded-full flex items-center justify-center text-text-secondary hover:bg-border transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='bg-bg/50 p-4 md:p-5 rounded-[1.5rem] border border-border focus-within:border-primary transition-colors mb-6'>
                <label className='text-[10px] md:text-xs font-black text-text-secondary uppercase tracking-widest block mb-1'>
                  Nama Panggilan
                </label>
                <input
                  type='text'
                  placeholder='Masukkan nama...'
                  className='w-full bg-transparent font-bold outline-none text-text-primary text-sm md:text-base'
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewMember()}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddNewMember}
                className='w-full bg-primary text-surface py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black shadow-lg text-lg'
              >
                Gabung Squad
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
