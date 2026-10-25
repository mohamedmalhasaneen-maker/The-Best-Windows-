import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Lock, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requiredPassword?: string;
}

export default function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  requiredPassword = '662006'
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === requiredPassword) {
      setError(false);
      setSuccess(true);
      setTimeout(() => {
        setPassword('');
        setSuccess(false);
        onSuccess();
      }, 600);
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
      />

      {/* Dialog container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl border border-slate-150 z-10 text-right p-6"
        dir="rtl"
      >
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="text-[#FACC15] shrink-0" size={18} />
            <span className="font-black text-slate-800 text-sm">قسم محمي بكلمة مرور</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center py-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <KeyRound size={22} className="text-[#0F172A]" />
            </div>
            <p className="text-slate-600 font-extrabold text-xs">يرجى إدخال رمز المرور الخاص بك للمتابعة</p>
          </div>

          <div>
            <input
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
              className="w-full p-3 text-center tracking-widest text-lg bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#FACC15] focus:border-[#0F172A] outline-none transition-all font-mono font-black"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-rose-600 text-xs font-bold justify-center"
            >
              <AlertCircle size={14} />
              <span>كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-emerald-600 text-xs font-bold justify-center"
            >
              <CheckCircle2 size={14} />
              <span>رمز صحيح! جاري الدخول...</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={success}
            className="w-full py-3 bg-[#0F172A] hover:bg-black text-white rounded-xl font-black text-xs transition duration-200 active:scale-95 cursor-pointer shadow-md"
          >
            تأكيد الدخول
          </button>
        </form>
      </motion.div>
    </div>
  );
}
