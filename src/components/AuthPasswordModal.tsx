import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Shield,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  FlaskConical,
  CalendarClock,
  Settings,
  Users
} from 'lucide-react';
import { UserRole, UserAccount } from '../types/aps';
import { ROLE_DEFINITIONS } from '../utils/apsEngine';

interface AuthPasswordModalProps {
  isOpen: boolean;
  targetRole: UserRole;
  userAccounts: UserAccount[];
  onClose: () => void;
  onSuccess: (role: UserRole) => void;
  onSwitchToViewer: () => void;
}

export const AuthPasswordModal: React.FC<AuthPasswordModalProps> = ({
  isOpen,
  targetRole,
  userAccounts,
  onClose,
  onSuccess,
  onSwitchToViewer
}) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(targetRole === 'VIEWER' ? 'PLANNER' : targetRole);

  // Sync selected role when targetRole changes
  React.useEffect(() => {
    if (targetRole !== 'VIEWER') {
      setSelectedRole(targetRole);
    }
    setPassword('');
    setErrorMsg(null);
  }, [targetRole, isOpen]);

  if (!isOpen) return null;

  const roleDef = ROLE_DEFINITIONS[selectedRole];
  const targetAccount = userAccounts.find((a) => a.role === selectedRole);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('请输入该岗位的独立访问密码');
      return;
    }

    if (targetAccount && targetAccount.passwordHash === password.trim()) {
      setErrorMsg(null);
      onSuccess(selectedRole);
    } else {
      setErrorMsg('密码错误，请重新输入或联系系统管理员');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'PLANNER':
        return <CalendarClock className="w-5 h-5 text-blue-600" />;
      case 'PROCESS_ENGINEER':
        return <FlaskConical className="w-5 h-5 text-emerald-600" />;
      case 'SUPERVISOR':
        return <Users className="w-5 h-5 text-amber-600" />;
      case 'ADMIN':
        return <Settings className="w-5 h-5 text-purple-600" />;
      default:
        return <Shield className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden font-sans">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                岗位独立密码权限验证
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                安全隔离验证 · 切换身份请输入对应岗位口令
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Role selector tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              选择需要验证登录的岗位角色：
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['PLANNER', 'PROCESS_ENGINEER', 'SUPERVISOR', 'ADMIN'] as UserRole[]).map((r) => {
                const isSelected = selectedRole === r;
                const def = ROLE_DEFINITIONS[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r);
                      setPassword('');
                      setErrorMsg(null);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 text-blue-950 font-bold shadow-2xs ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div className="shrink-0">{getRoleIcon(r)}</div>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{def?.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-500 truncate">{def?.department.split(' ')[0]}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Responsibilities Summary Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                {roleDef?.name} 专属权限
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                {targetAccount?.name || '岗位专员'}
              </span>
            </div>
            <ul className="text-slate-600 text-[11px] space-y-1 list-disc list-inside">
              {roleDef?.permissions.slice(0, 3).map((p, idx) => (
                <li key={idx} className="truncate">
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Password Form */}
          <form onSubmit={handleVerifyPassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                岗位独立访问密码：
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder={`请输入 ${roleDef?.name.split(' ')[0]} 岗位独立密码`}
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onSwitchToViewer();
                  onClose();
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                保持查看权限 (只读)
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>验证并解锁权限</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
