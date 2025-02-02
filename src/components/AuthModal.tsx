import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { addNotification } = useNotifications();

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPhone(value);
    }
  };

  const handleTcNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setTcNo(value);
    }
  };

  const validateTcNo = (tcno: string): boolean => {
    if (tcno.length !== 11) return false;
    
    const digits = tcno.split('').map(Number);
    
    // First digit cannot be 0
    if (digits[0] === 0) return false;
    
    // Check digit calculations
    const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const even = digits[1] + digits[3] + digits[5] + digits[7];
    const digit10 = ((odd * 7) - even) % 10;
    const digit11 = (digits.slice(0, 10).reduce((sum, d) => sum + d, 0)) % 10;
    
    return digits[9] === digit10 && digits[10] === digit11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        // Validation
        if (!email || !email.includes('@')) {
          throw new Error('Geçerli bir e-posta adresi giriniz');
        }

        if (!password || password.length < 6) {
          throw new Error('Şifre en az 6 karakter olmalıdır');
        }

        if (!tcNo || !validateTcNo(tcNo)) {
          throw new Error('Geçerli bir TC kimlik numarası giriniz');
        }

        if (!phone || phone.length !== 10) {
          throw new Error('Telefon numarası 10 haneli olmalıdır');
        }

        if (!fullName || fullName.trim().length < 3) {
          throw new Error('Geçerli bir ad soyad giriniz');
        }

        if (!birthDate) {
          throw new Error('Doğum tarihi giriniz');
        }

        // Validate age (must be at least 18 years old)
        const today = new Date();
        const birth = new Date(birthDate);
        let userAge = today.getFullYear() - birth.getFullYear();
        
        // Adjust age if birthday hasn't occurred this year
        if (
          today.getMonth() < birth.getMonth() || 
          (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
        ) {
          userAge--;
        }

        if (userAge < 18) {
          throw new Error('18 yaşından küçükler kayıt olamaz');
        }

        // Register new user
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              birth_date: birthDate,
              tc_no: tcNo.trim(),
              phone: phone.trim()
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error('Bu e-posta adresi ile kayıtlı bir hesap bulunmaktadır');
          }
          throw signUpError;
        }

        if (!data.user) {
          throw new Error('Kayıt işlemi başarısız oldu. Lütfen daha sonra tekrar deneyin.');
        }

        setSuccess(true);
        addNotification({
          type: 'success',
          title: 'Başarılı',
          message: 'Hesabınız oluşturuldu'
        });

        setTimeout(() => {
          onClose();
        }, 2000);

      } else {
        // Login flow
        if (!email) {
          throw new Error('E-posta adresi giriniz');
        }

        if (!password) {
          throw new Error('Şifre giriniz');
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
          options: {
            persistSession: rememberMe
          }
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('E-posta adresi veya şifre hatalı');
          }
          throw signInError;
        }

        if (!signInData.user) {
          throw new Error('Giriş yapılamadı');
        }

        addNotification({
          type: 'success',
          title: 'Başarılı',
          message: 'Giriş yapıldı'
        });

        onClose();
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Başarıyla Kayıt Oldunuz
            </h3>
            <p className="text-sm text-gray-500">
              Hesabınıza yönlendiriliyorsunuz...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">
          {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TC Kimlik No
                </label>
                <input
                  type="text"
                  value={tcNo}
                  onChange={handleTcNoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  pattern="\d{11}"
                  title="11 haneli TC kimlik numarası giriniz"
                  placeholder="XXXXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doğum Tarihi
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="mt-1 text-xs text-gray-500">
                  18 yaşından büyük olmanız gerekmektedir
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon Numarası
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    +90
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="5XX XXX XX XX"
                    pattern="\d{10}"
                    title="10 haneli telefon numarası giriniz"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Başında 0 olmadan 10 haneli numara giriniz
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          {mode === 'login' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Beni Hatırla
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
      </div>
    </div>
  );
}