"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AuthState } from "@/types";

interface SettingsPanelProps {
  authState: AuthState;
  editUsername: string;
  setEditUsername: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editPassword: string;
  setEditPassword: (v: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onLogout: () => void;
}

export const SettingsPanel = ({
  authState,
  editUsername,
  setEditUsername,
  editEmail,
  setEditEmail,
  editPassword,
  setEditPassword,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onLogout,
}: SettingsPanelProps) => {
  return (
    <div className="max-w-md mx-auto space-y-6 p-4">
      <Card className="p-6 bg-gray-800 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>

        {!isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Username</label>
              <p className="text-white">{authState.user?.username}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <p className="text-white">{authState.user?.email}</p>
            </div>
            <Button onClick={onEdit} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Edit Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Username</label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">New Password</label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={onSave} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                Save
              </Button>
              <Button onClick={onCancel} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-gray-800 border-gray-700">
        <h4 className="text-md font-semibold text-white mb-3">Theme</h4>
        <div className="flex gap-2">
          <Button className="flex-1 bg-gray-600 text-white" disabled>Dark</Button>
          <Button className="flex-1 bg-gray-200 text-black" disabled>Light</Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          (Şimdilik görsel. Ileride tema için bağlayacağız.)
        </p>
      </Card>

      <Button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700 text-white">
        Logout
      </Button>
    </div>
  );
};
