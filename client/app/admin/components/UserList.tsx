'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
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
}

export default function UserList({ users, page, pages, setPage, loading }: UserListProps) {
  if (loading) {
      return <div className="text-center py-12 text-zinc-500">Loading users...</div>;
  }

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-zinc-200 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No users found</td>
                </tr>
            ) : (
                users.map((user) => (
                    <tr key={user._id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                                        {user.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            <span className="font-medium text-zinc-200">{user.username}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex flex-col">
                            {user.email && <span>{user.email}</span>}
                            {user.phone && <span className="text-xs text-zinc-500">{user.phone}</span>}
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                            {user.role}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                         <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_profile_complete ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_profile_complete ? 'bg-green-400' : 'bg-yellow-400'}`} />
                            {user.is_profile_complete ? 'Active' : 'Incomplete'}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                        <button className="p-1 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition-colors">
                            <MoreHorizontal size={16} />
                        </button>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
            Page {page} of {pages}
        </span>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1 rounded-md hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
                <ChevronLeft size={16} />
            </button>
            <button 
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="p-1 rounded-md hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
                <ChevronRight size={16} />
            </button>
        </div>
      </div>
    </div>
  );
}
