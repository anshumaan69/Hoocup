'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../services/api';
import UserList from './components/UserList';
import CreateUserModal from './components/CreateUserModal';
import { Users, Plus, LayoutDashboard, Search, Home, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0 });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Admin routes are at /api/admin. 
      // Default baseURL is /api/auth. Using .. to traverse up.
      // Final URL: /api/auth/../admin/users -> /api/admin/users
      const { data } = await api.get(`../admin/users?page=${page}&limit=10`);
      console.log('DEBUG: FULL API RESPONSE:', data); // Inspect structure
      console.log('DEBUG: Users Array:', data.data);
      setUsers(data.data || []); // Safety fallback
      setPages(data.pages);
      setStats({ 
          totalUsers: data.total,
          activeUsers: data.data.filter((u:any) => u.is_profile_complete).length // This is just page stats, ideally backend sends real stats
      }); 
    } catch (error: any) {
        console.error('Failed to fetch users', error);
        if (error.response?.status === 403 || error.response?.status === 401) {
            alert('Access Denied: Admins Only');
            router.push('/home');
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleLogout = async () => {
    try {
        await api.post('/logout');
        router.push('/login'); 
    } catch (error) {
        console.error('Logout failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <LayoutDashboard className="text-blue-500" />
                    Admin Dashboard
                </h1>
                <p className="text-zinc-400 mt-1">Manage users and platform settings</p>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => router.push('/home')}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Home size={18} />
                    Go to App
                </button>
                 <button 
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <LogOut size={18} />
                    Logout
                </button>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus size={18} />
                    Create User
                </button>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-zinc-400">Total Users</p>
                        <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-lg text-zinc-400">
                        <Users size={20} />
                    </div>
                </div>
            </div>
             {/* Add more stats here later */}
        </div>

        {/* User Management */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">User Management</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64 transition-colors"
                    />
                </div>
            </div>

            <UserList 
                users={users} 
                page={page} 
                pages={pages} 
                setPage={setPage} 
                loading={loading} 
            />
        </div>
      </div>

      <CreateUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onUserCreated={fetchUsers}
      />
    </div>
  );
}
