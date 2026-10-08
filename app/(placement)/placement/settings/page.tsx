'use client';

import { useEffect, useState } from 'react';
import { Loader2, Settings2, Save, Users, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [weights, setWeights] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<any>(null);

  useEffect(() => {
    fetch('/api/placement/settings')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setWeights(json.data.weights);
          setRoles(json.data.roles);
        }
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/placement/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights, roles })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Settings saved successfully! The readiness reports will automatically recalculate.');
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const setWeight = (key: string, val: string) => {
    const num = parseFloat(val);
    setWeights((w: any) => ({ ...w, [key]: isNaN(num) ? 0 : num }));
  };

  const handleEditRole = (index: number) => {
    setEditingIndex(index);
    setEditingRole(JSON.parse(JSON.stringify(roles[index])));
  };

  const handleAddRole = () => {
    const newRole = { id: 'new_role', title: 'New Role', aliases: [], skills: [] };
    setRoles([...roles, newRole]);
    setEditingIndex(roles.length);
    setEditingRole(newRole);
  };

  const handleSaveRole = () => {
    if (editingIndex !== null) {
      const newRoles = [...roles];
      newRoles[editingIndex] = editingRole;
      setRoles(newRoles);
      setEditingIndex(null);
      setEditingRole(null);
    }
  };

  const handleDeleteRole = (index: number) => {
    const newRoles = roles.filter((_, i) => i !== index);
    setRoles(newRoles);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const weightKeys = Object.keys(weights || {});
  const totalWeight = weightKeys.reduce((acc, k) => acc + weights[k], 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="w-6 h-6" /> Platform Configuration
            </h1>
            <p className="text-sm text-gray-500 mt-1">Configure scoring weights and role catalog dynamically.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || Math.abs(totalWeight - 1) > 1e-5}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Scoring Algorithm Weights</h2>
          <p className="text-sm text-gray-500 mb-6">
            Adjust the significance of each core dimension. Must sum to exactly 1.0. Current sum: <span className={Math.abs(totalWeight - 1) > 1e-5 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>{totalWeight.toFixed(2)}</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weightKeys.map(k => (
              <div key={k}>
                <label className="block text-sm font-medium mb-1 capitalize">{k.replace(/([A-Z])/g, ' $1')}</label>
                <input 
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={weights[k]}
                  onChange={(e) => setWeight(k, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" /> Target Roles Catalog
            </h2>
            <button onClick={handleAddRole} className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg font-medium">
              <Plus className="w-4 h-4" /> Add Role
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-6">These presets map student target roles to essential skills.</p>
          
          <div className="space-y-4">
            {roles.map((r, i) => (
              <div key={i} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                {editingIndex === i ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Role ID</label>
                        <input value={editingRole.id} onChange={e => setEditingRole({...editingRole, id: e.target.value})} className="w-full text-sm border rounded px-2 py-1 dark:bg-zinc-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Title</label>
                        <input value={editingRole.title} onChange={e => setEditingRole({...editingRole, title: e.target.value})} className="w-full text-sm border rounded px-2 py-1 dark:bg-zinc-900" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Aliases (comma separated)</label>
                      <input value={editingRole.aliases.join(', ')} onChange={e => setEditingRole({...editingRole, aliases: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)})} className="w-full text-sm border rounded px-2 py-1 dark:bg-zinc-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Skills JSON</label>
                      <textarea value={JSON.stringify(editingRole.skills)} onChange={e => {
                        try { setEditingRole({...editingRole, skills: JSON.parse(e.target.value)}) } catch {}
                      }} className="w-full text-xs font-mono border rounded px-2 py-1 h-20 dark:bg-zinc-900" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingIndex(null)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 dark:hover:bg-zinc-800">Cancel</button>
                      <button onClick={handleSaveRole} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save Role</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-blue-600">{r.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditRole(i)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded bg-gray-50 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteRole(i)} className="p-1.5 text-gray-500 hover:text-red-600 rounded bg-gray-50 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Aliases: </span>
                      <span className="text-gray-500">{r.aliases.join(', ')}</span>
                    </div>
                    <div className="mt-3">
                      <span className="font-medium text-sm">Key Skills:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {r.skills.map((s: any) => (
                          <span key={s.id} className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded text-xs">
                            {s.id} (wt: {s.importance})
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
