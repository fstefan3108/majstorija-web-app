import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

const extractUserFromToken = (accessToken) => {
  const decoded = jwtDecode(accessToken);
  const id = parseInt(
    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
    || decoded.nameid
    || decoded.sub
  );
  const emailFromToken =
    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
    || decoded.email;
  const nameFromToken =
    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
    || decoded.unique_name
    || decoded.name;
  const role =
    decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
    || decoded.role;

  const name     = localStorage.getItem('userName')  || nameFromToken;
  const email    = localStorage.getItem('userEmail') || emailFromToken;
  const locRaw   = localStorage.getItem('userLocation');
  const location = locRaw ? JSON.parse(locRaw) : null;

  return { id, email, name, role, accessToken, location };
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      try {
        const userData = extractUserFromToken(accessToken);
        setUser(userData);
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userLocation');
      }
    }
    setLoading(false);
  }, []);

  const login = async (authResponse) => {
    localStorage.setItem('accessToken', authResponse.accessToken);
    if (authResponse.refreshToken) {
      localStorage.setItem('refreshToken', authResponse.refreshToken);
    }
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userLocation');
    try {
      const userData = extractUserFromToken(authResponse.accessToken);
      localStorage.setItem('userName', userData.name);
      localStorage.setItem('userEmail', userData.email);

      // Fetch profila iz baze da dobijemo koordinate
      const endpoint = userData.role === 'Craftsman'
        ? `http://localhost:5114/api/craftsmen/${userData.id}`
        : `http://localhost:5114/api/users/${userData.id}`;

      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${authResponse.accessToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          const p = json.data;
          if (p?.latitude && p?.longitude) {
            const location = { name: p.location || p.city || '', lat: p.latitude, lng: p.longitude };
            localStorage.setItem('userLocation', JSON.stringify(location));
            setUser({ ...userData, location });
            return;
          }
        }
      } catch { /* nema lokacije, nastavlja se bez nje */ }

      setUser(userData);
    } catch (error) {
      console.error('Error decoding token on login:', error);
    }
  };

  const updateUser = (updatedFields) => {
    setUser(prev => {
      const updated = { ...prev, ...updatedFields };
      if (updatedFields.name)     localStorage.setItem('userName', updatedFields.name);
      if (updatedFields.email)    localStorage.setItem('userEmail', updatedFields.email);
      if ('location' in updatedFields) {
        if (updatedFields.location) {
          localStorage.setItem('userLocation', JSON.stringify(updatedFields.location));
        } else {
          localStorage.removeItem('userLocation');
        }
      }
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userLocation');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
