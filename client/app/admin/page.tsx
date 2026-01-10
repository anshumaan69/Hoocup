'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../services/api';
import UserList from './components/UserList';
import CreateUserModal from './components/CreateUserModal';
import { Users, Plus, LayoutDashboard, Search, Home, LogOut, Lock } from 'lucide-react';

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
      // BaseURL is /api. So we just need /admin/users
      const { data } = await api.get(`/admin/users?page=${page}&limit=10`);
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
        await api.post('/auth/logout');
        
        // Force client-side cleanup
        if (typeof document !== 'undefined') {
            document.cookie = 'access_token=; Max-Age=0; path=/;';
            document.cookie = 'refresh_token=; Max-Age=0; path=/;';
            document.cookie = 'csrf_token=; Max-Age=0; path=/;';
        }
        
        router.push('/login'); 
    } catch (error) {
        console.error('Logout failed', error);
        // Force logout anyway
         if (typeof document !== 'undefined') {
            document.cookie = 'access_token=; Max-Age=0; path=/;';
            document.cookie = 'refresh_token=; Max-Age=0; path=/;';
            document.cookie = 'csrf_token=; Max-Age=0; path=/;';
        }
        router.push('/login');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
        await api.delete(`/admin/users/${userId}`);
        // Optimistic update or refetch
        setUsers(users.filter((u: any) => u._id !== userId));
        alert('User deleted successfully');
    } catch (error) {
        console.error('Delete failed', error);
        alert('Failed to delete user');
    }
  };

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
        await api.patch(`/admin/users/${userId}/status`, { status });
        // Refetch to get updated status and expiry
        fetchUsers();
    } catch (error) {
        console.error('Status update failed', error);
        alert('Failed to update user status');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <LayoutDashboard className="text-primary" />
                    Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">Manage users and platform settings</p>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => router.push('/home')}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Home size={18} />
                    Go to App
                </button>
                 <button 
                    onClick={() => router.push('/admin/requests')}
                    className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/20 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Lock size={18} />
                    Requests
                </button>
                 <button 
                    onClick={handleLogout}
                    className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <LogOut size={18} />
                    Logout
                </button>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Plus size={18} />
                    Create User
                </button>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">{stats.totalUsers}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                        <Users size={20} />
                    </div>
                </div>
            </div>
             {/* Add more stats here later */}
        </div>

        {/* User Management */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">User Management</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-all placeholder:text-muted-foreground"
                    />
                </div>
            </div>

            <UserList 
                users={users} 
                page={page} 
                pages={pages} 
                setPage={setPage} 
                loading={loading}
                onDelete={handleDeleteUser}
                onUpdateStatus={handleUpdateStatus}
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
