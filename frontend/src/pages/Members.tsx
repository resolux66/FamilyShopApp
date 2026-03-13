import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Mail, Shield, Copy, Check } from 'lucide-react';
import { api } from '../api/client';
import type { Invite } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { formatDate, relativeTime } from '../utils/time';
import { Navigate } from 'react-router-dom';

interface Member {
  id: string;
  email?: string;
  display_name: string;
  role: 'admin' | 'member';
  joined_at: number | null;
  created_at: number;
}

interface MembersData {
  members: Member[];
  invites: Invite[];
}

function CopyLinkButton({ inviteId }: { inviteId: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join?token=${inviteId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium min-h-[44px]"
      aria-label="Copy invite link"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}

export function Members() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get<MembersData>('/members'),
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post<Invite>('/invites', { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setInviteEmail('');
      showToast('Invite created! Copy the link and share it.', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => api.delete(`/invites/${inviteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Invite revoked', 'info');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Member removed', 'info');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate(inviteEmail.trim().toLowerCase());
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Members</h1>

      {/* Invite form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-green-600" />
          Invite a member
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Enter their email, then copy the invite link and share it via WhatsApp, iMessage, or email.
        </p>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
            disabled={inviteMutation.isPending}
          />
          <button
            type="submit"
            disabled={!inviteEmail.trim() || inviteMutation.isPending}
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
          >
            Create Invite
          </button>
        </form>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Members ({data?.members.length ?? 0})
          </h2>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data?.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {member.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{member.display_name}</span>
                    {member.role === 'admin' && (
                      <span className="flex items-center gap-0.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  {member.email && (
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  )}
                  {member.joined_at && (
                    <p className="text-xs text-gray-400">
                      Joined {relativeTime(member.joined_at)}
                    </p>
                  )}
                </div>
                {member.id !== user?.id && member.role !== 'admin' && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${member.display_name}?`)) {
                        removeMutation.mutate(member.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Remove ${member.display_name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {(data?.invites?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">
              Pending Invites ({data!.invites.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data!.invites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 truncate">{invite.email}</p>
                  <p className="text-xs text-gray-400">
                    Created {relativeTime(invite.created_at)} · Expires {formatDate(invite.expires_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CopyLinkButton inviteId={invite.id} />
                  <button
                    onClick={() => revokeMutation.mutate(invite.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Revoke invite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
