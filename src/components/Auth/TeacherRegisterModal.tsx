import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Gender, Teacher } from '../../types';
import {
  UserPlus,
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Cloud,
  HardDrive,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface TeacherRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisteredSuccess: (teacher: Teacher, autoLogin: boolean) => void;
}

export const TeacherRegisterModal: React.FC<TeacherRegisterModalProps> = ({
  isOpen,
  onClose,
  onRegisteredSuccess,
}) => {
  const { subjects, classes, registerTeacher, cloudState } = useApp();

  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [gender, setGender] = useState<Gender>('L');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHomeroom, setIsHomeroom] = useState(false);
  const [homeroomClassId, setHomeroomClassId] = useState(classes[0]?.id || '');
  const [taughtSubjectIds, setTaughtSubjectIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredTeacher, setRegisteredTeacher] = useState<Teacher | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setNip('');
    setGender('L');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setIsHomeroom(false);
    setHomeroomClassId(classes[0]?.id || '');
    setTaughtSubjectIds([]);
    setErrorMessage(null);
    setRegisteredTeacher(null);
    setSuccessMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubjectToggle = (subjectId: string) => {
    setTaughtSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (name.trim().length < 3) {
      setErrorMessage('Nama lengkap minimal 3 karakter.');
      return;
    }
    if (nip.trim().length < 4) {
      setErrorMessage('NIP / NUPTK minimal 4 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Masukkan alamat email yang valid.');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak sama.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerTeacher({
      name: name.trim(),
      nip: nip.trim(),
      gender,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: password.trim(),
      isHomeroom,
      homeroomClassId: isHomeroom ? homeroomClassId : undefined,
      taughtSubjectIds,
    });
    setIsSubmitting(false);

    if (!result.success || !result.teacher) {
      setErrorMessage(result.message);
      return;
    }

    setRegisteredTeacher(result.teacher);
    setSuccessMessage(result.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pendaftaran Akun Guru Baru
              </h3>
              <p className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-0.5">
                {cloudState.mode === 'connected' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersimpan langsung ke database cloud Upstash</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tersimpan di penyimpanan lokal browser</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {registeredTeacher ? (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-slate-900">
                Akun Guru Berhasil Didaftarkan!
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                {successMessage}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5 max-w-md mx-auto">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Nama:</span>
                <span className="font-bold text-slate-900 text-right">{registeredTeacher.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">NIP / NUPTK:</span>
                <span className="font-mono font-semibold text-slate-800">{registeredTeacher.nip}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Email Login:</span>
                <span className="font-mono font-semibold text-emerald-800">{registeredTeacher.email}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  const created = registeredTeacher;
                  resetForm();
                  onRegisteredSuccess(created, false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Kembali ke Login
              </button>
              <button
                type="button"
                onClick={() => {
                  const created = registeredTeacher;
                  resetForm();
                  onRegisteredSuccess(created, true);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Masuk ke Portal Guru</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                Nama Lengkap &amp; Gelar Akademik <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  NIP / NUPTK <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 198604122011011005"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  Jenis Kelamin
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="L">Laki-laki (Bapak Guru)</option>
                  <option value="P">Perempuan (Ibu Guru)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  Alamat Email (untuk Login) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi.santoso@sekolah.sch.id"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  Nomor WhatsApp / Telepon
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  Ulangi Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Homeroom Assignment */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={isHomeroom}
                  onChange={(e) => setIsHomeroom(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Saya juga bertugas sebagai Wali Kelas</span>
              </label>

              {isHomeroom && (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Pilih Kelas Binaan:
                  </label>
                  <select
                    value={homeroomClassId}
                    onChange={(e) => setHomeroomClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Taught Subjects */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mata Pelajaran yang Diampu (Opsional)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                {subjects.map((sub) => {
                  const isChecked = taughtSubjectIds.includes(sub.id);
                  return (
                    <label
                      key={sub.id}
                      className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSubjectToggle(sub.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="truncate">
                        [{sub.code}] {sub.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
