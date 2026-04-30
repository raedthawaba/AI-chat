import { useEffect } from 'react';

export default function AuthSuccess() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      window.location.href = '/';
    } else {
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>جاري تسجيل الدخول، يرجى الانتظار...</p>
    </div>
  );
}
