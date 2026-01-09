'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  status?: string; // 'active', 'banned', 'suspended'
  is_profile_complete: boolean;
  created_at: string;
  avatar: string;
}

interface UserListProps {
  users: User[];
  page: number;
  pages: number;
  setPage: (page: number) => void;
  loading: boolean;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

// Import icons
import { Trash2, Ban, PauseCircle, PlayCircle, Crown } from 'lucide-react';

export default function UserList({ users, page, pages, setPage, loading, onDelete, onUpdateStatus }: UserListProps) {
  if (loading) {
      return <div className="text-center py-12 text-zinc-500">Loading users...</div>;
  }

  if (!users || !Array.isArray(users)) {
      console.error('UserList Error: users prop is not an array', users);
      return <div className="text-center py-12 text-zinc-500">Error loading users.</div>;
  }

  return (
    <div className="w-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-muted-foreground">
          <thead className="bg-secondary/50 text-foreground uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No users found</td>
                </tr>
            ) : (
                users.map((user) => (
                    <tr key={user._id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                        {user.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            <span className="font-medium text-foreground">{user.username}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex flex-col">
                            {user.email && <span>{user.email}</span>}
                            {user.phone && <span className="text-xs text-muted-foreground">{user.phone}</span>}
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                            {user.role}
                        </span>
                        {user.role === 'superadmin' && (
                            <Crown size={14} fill="#BF913B" className="text-[#BF913B] ml-2" />
                        )}
                        </td>
                        <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                            {/* Profile Status */}
                             <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                user.is_profile_complete ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.is_profile_complete ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                {user.is_profile_complete ? 'Active' : 'Incomplete'}
                            </span>
                            {/* Account Status */}
                            {user.status && user.status !== 'active' && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                    user.status === 'banned' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                }`}>
                                    {user.status.toUpperCase()}
                                </span>
                            )}
                         </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                                {user.role !== 'admin' && (
                                    <>
                                        {user.status === 'active' || !user.status ? (
                                            <>
                                                <button 
                                                    onClick={() => onUpdateStatus(user._id, 'banned')}
                                                    title="Ban for 30 days"
                                                    className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateStatus(user._id, 'suspended')}
                                                    title="Suspend Indefinitely"
                                                    className="p-1.5 hover:bg-orange-500/10 text-muted-foreground hover:text-orange-500 rounded-md transition-colors"
                                                >
                                                    <PauseCircle size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={() => onUpdateStatus(user._id, 'active')}
                                                title="Reactivate Account"
                                                className="p-1.5 hover:bg-green-500/10 text-muted-foreground hover:text-green-500 rounded-md transition-colors"
                                            >
                                                <PlayCircle size={16} />
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={() => onDelete(user._id)}
                                            title="Delete User"
                                            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
            Page {page} of {pages}
        </span>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-foreground"
            >
                <ChevronLeft size={16} />
            </button>
            <button 
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="p-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-foreground"
            >
                <ChevronRight size={16} />
            </button>
        </div>
      </div>
    </div>
  );
}
