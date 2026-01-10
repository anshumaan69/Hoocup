'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../services/api';
import { ArrowLeft, Check, X, Lock } from 'lucide-react';
import Image from 'next/image';

interface AccessRequest {
    _id: string;
    requester: {
        _id: string;
        username: string;
        avatar: string;
        first_name: string;
        last_name: string;
    };
    targetUser: {
        _id: string;
        username: string;
        avatar: string;
        first_name: string;
        last_name: string;
    };
    status: 'pending' | 'granted' | 'rejected';
    createdAt: string;
}

export default function AdminRequestsPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/photo-access/requests');
            setRequests(data.data || []);
        } catch (error: any) {
            console.error('Failed to fetch requests', error);
            if (error.response?.status === 403 || error.response?.status === 401) {
                alert('Access Denied');
                router.push('/home');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleUpdateStatus = async (id: string, status: 'granted' | 'rejected') => {
        try {
            await api.patch(`/admin/photo-access/requests/${id}`, { status });
            // Optimistic update
            setRequests(requests.filter(r => r._id !== id));
            alert(`Request ${status}`);
        } catch (error) {
            console.error('Update failed', error);
            alert('Failed to update request');
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                 <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/admin')}
                        className="p-2 hover:bg-secondary/80 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                         <Lock className="text-primary" />
                         Photo Access Requests
                    </h1>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-12 bg-card border border-border rounded-xl">
                        <p className="text-muted-foreground">No pending requests.</p>
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-secondary/50 border-b border-border">
                                <tr>
                                    <th className="p-4 font-semibold text-muted-foreground">Requester</th>
                                    <th className="p-4 font-semibold text-muted-foreground">Target User</th>
                                    <th className="p-4 font-semibold text-muted-foreground">Date</th>
                                    <th className="p-4 font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {requests.map((request) => (
                                    <tr key={request._id} className="hover:bg-muted/20 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                 <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted">
                                                    {request.requester.avatar ? (
                                                        <Image src={request.requester.avatar} alt={request.requester.username} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs">{request.requester.username[0]}</div>
                                                    )}
                                                 </div>
                                                 <div>
                                                    <p className="font-medium text-sm">{request.requester.first_name} {request.requester.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">@{request.requester.username}</p>
                                                 </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                 <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted">
                                                    {request.targetUser.avatar ? (
                                                        <Image src={request.targetUser.avatar} alt={request.targetUser.username} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs">{request.targetUser.username[0]}</div>
                                                    )}
                                                 </div>
                                                 <div>
                                                    <p className="font-medium text-sm">{request.targetUser.first_name} {request.targetUser.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">@{request.targetUser.username}</p>
                                                 </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">
                                            {new Date(request.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleUpdateStatus(request._id, 'granted')}
                                                    className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-full transition-colors"
                                                    title="Approve"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(request._id, 'rejected')}
                                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-full transition-colors"
                                                    title="Reject"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
