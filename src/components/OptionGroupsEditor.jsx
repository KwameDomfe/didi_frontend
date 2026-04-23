import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
import { useApp } from '../App';

/**
 * Inline editor for the option groups (and their choices) attached to a menu item.
 * Used inside the "Options" tab of MenuItemFormModal (edit mode only).
 *
 * API endpoints used:
 *   GET    /api/option-groups/?menu_item={id}
 *   POST   /api/option-groups/           { menu_item, name, required, min_selections, max_selections }
 *   PATCH  /api/option-groups/{id}/      { name, required, min_selections, max_selections }
 *   DELETE /api/option-groups/{id}/
 *   POST   /api/option-choices/          { group, name, price_modifier }
 *   PATCH  /api/option-choices/{id}/     { name, price_modifier }
 *   DELETE /api/option-choices/{id}/
 */
export default function OptionGroupsEditor({ menuItemId }) {
  const { API_BASE_URL } = useApp();
  const token = localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Token ${token}` };

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── new-group form state ──
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', required: false, min_selections: 1, max_selections: 1 });
  const [savingGroup, setSavingGroup] = useState(false);

  // ── per-group "add choice" form state: { [groupId]: { name, price_modifier } }
  const [choiceForms, setChoiceForms] = useState({});
  const [savingChoice, setSavingChoice] = useState({});

  const fetchGroups = useCallback(async () => {
    if (!menuItemId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/option-groups/?menu_item=${menuItemId}`, {
        headers: authHeaders,
      });
      const data = res.data;
      setGroups(Array.isArray(data) ? data : data?.results ?? []);
    } catch {
      setError('Failed to load option groups.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, menuItemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  /* ── Group CRUD ── */

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    setSavingGroup(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/option-groups/`,
        {
          menu_item: menuItemId,
          name: newGroup.name.trim(),
          required: newGroup.required,
          min_selections: Number(newGroup.min_selections) || 1,
          max_selections: Number(newGroup.max_selections) || 1,
        },
        { headers: authHeaders }
      );
      setNewGroup({ name: '', required: false, min_selections: 1, max_selections: 1 });
      setShowNewGroupForm(false);
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create option group.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this option group and all its choices?')) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/option-groups/${groupId}/`, { headers: authHeaders });
      fetchGroups();
    } catch {
      setError('Failed to delete option group.');
    }
  };

  /* ── Choice CRUD ── */

  const openChoiceForm = (groupId) => {
    setChoiceForms((prev) => ({ ...prev, [groupId]: { name: '', price_modifier: '0.00' } }));
  };

  const closeChoiceForm = (groupId) => {
    setChoiceForms((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  };

  const handleChoiceFormChange = (groupId, field, value) => {
    setChoiceForms((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], [field]: value },
    }));
  };

  const handleAddChoice = async (e, groupId) => {
    e.preventDefault();
    const form = choiceForms[groupId];
    if (!form?.name?.trim()) return;
    setSavingChoice((prev) => ({ ...prev, [groupId]: true }));
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/option-choices/`,
        {
          group: groupId,
          name: form.name.trim(),
          price_modifier: parseFloat(form.price_modifier) || 0,
        },
        { headers: authHeaders }
      );
      closeChoiceForm(groupId);
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add choice.');
    } finally {
      setSavingChoice((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleDeleteChoice = async (choiceId) => {
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/option-choices/${choiceId}/`, { headers: authHeaders });
      fetchGroups();
    } catch {
      setError('Failed to delete choice.');
    }
  };

  /* ── Render ── */

  if (!menuItemId) {
    return (
      <div className="ba br0-25 pa0-75 bg-gold5 brown0 f0-85">
        Save the item first, then return here to add option groups.
      </div>
    );
  }

  if (loading) {
    return <div className="tc pa2-00 brown0 f0-85">Loading option groups…</div>;
  }

  return (
    <div className="flex flex-column ggap1-00">
      {error && (
        <div className="ba br0-25 pa0-75 bg-gold5 brown0 flex justify-between items-center f0-85">
          <span>{error}</span>
          <button type="button" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer" onClick={() => setError('')}>
            <FaTimes />
          </button>
        </div>
      )}

      {groups.length === 0 && !showNewGroupForm && (
        <p className="brown0 f0-85">No option groups yet. Add one below so customers can customise this item.</p>
      )}

      {/* Existing groups */}
      {groups.map((group) => (
        <div key={group.id} className="ba br0-25 shadow-4">
          {/* Group header */}
          <div className="flex justify-between items-center pa0-75 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0' }}>
            <div className="flex items-center ggap0-50">
              <strong>{group.name}</strong>
              <span className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 f0-75">
                {group.required ? 'Required' : 'Optional'}
              </span>
              <span className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 f0-75">
                {group.max_selections === 1 ? 'Choose 1' : `Up to ${group.max_selections}`}
              </span>
            </div>
            <button
              type="button"
              className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer flex items-center ggap0-25 f0-85"
              onClick={() => handleDeleteGroup(group.id)}
            >
              <FaTrash /> Delete group
            </button>
          </div>

          <div className="pa0-75 brown0">
            {/* Choice list */}
            {(group.choices || []).length > 0 ? (
              <ul className="list-none pl0-00 mb0-75 flex flex-column ggap0-25">
                {group.choices.map((choice) => (
                  <li
                    key={choice.id}
                    className="flex justify-between items-center pa0-50 ba br0-25 b--brown0"
                  >
                    <span className="f0-90">
                      {choice.name}
                      {parseFloat(choice.price_modifier) > 0 && (
                        <span className="f0-75 ml0-50">+GHC {parseFloat(choice.price_modifier).toFixed(2)}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-75"
                      onClick={() => handleDeleteChoice(choice.id)}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="brown0 f0-85 mb0-75">No choices yet.</p>
            )}

            {/* Add choice form */}
            {choiceForms[group.id] ? (
              <form
                className="flex flex-wrap ggap0-75 items-end"
                onSubmit={(e) => handleAddChoice(e, group.id)}
              >
                <div>
                  <label className="b db mb0-25 f0-85">Choice name</label>
                  <input
                    type="text"
                    className="ba br0-25 b--brown0 brown0 pa0-50"
                    placeholder="e.g. Extra cheese"
                    value={choiceForms[group.id].name}
                    onChange={(e) => handleChoiceFormChange(group.id, 'name', e.target.value)}
                    required
                    style={{ minWidth: '160px' }}
                  />
                </div>
                <div>
                  <label className="b db mb0-25 f0-85">Price add-on (GHC)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="ba br0-25 b--brown0 brown0 pa0-50"
                    value={choiceForms[group.id].price_modifier}
                    onChange={(e) => handleChoiceFormChange(group.id, 'price_modifier', e.target.value)}
                    style={{ width: '120px' }}
                  />
                </div>
                <div className="flex ggap0-25">
                  <button
                    type="submit"
                    className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 pointer b f0-85"
                    disabled={savingChoice[group.id]}
                    style={savingChoice[group.id] ? { opacity: 0.5 } : undefined}
                  >
                    {savingChoice[group.id] ? 'Saving…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 pointer f0-85"
                    onClick={() => closeChoiceForm(group.id)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 pointer flex items-center ggap0-25 f0-85"
                onClick={() => openChoiceForm(group.id)}
              >
                <FaPlus /> Add choice
              </button>
            )}
          </div>
        </div>
      ))}

      {/* New group form */}
      {showNewGroupForm ? (
        <form className="ba br0-25 pa0-75 bg-gold5 brown0" onSubmit={handleAddGroup}>
          <h6 className="b mb0-75 f1-00">New option group</h6>
          <div className="mb0-75">
            <label className="b db mb0-25 f0-85">Group name *</label>
            <input
              type="text"
              className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
              placeholder="e.g. Choose your size"
              value={newGroup.name}
              onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid gtc2-m ggap0-75 mb0-75">
            <div>
              <label className="b db mb0-25 f0-85">Min selections</label>
              <input
                type="number"
                min="0"
                className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                value={newGroup.min_selections}
                onChange={(e) => setNewGroup((p) => ({ ...p, min_selections: e.target.value }))}
              />
            </div>
            <div>
              <label className="b db mb0-25 f0-85">Max selections</label>
              <input
                type="number"
                min="1"
                className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                value={newGroup.max_selections}
                onChange={(e) => setNewGroup((p) => ({ ...p, max_selections: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center ggap0-50 mb0-75 pointer">
            <input
              type="checkbox"
              checked={newGroup.required}
              onChange={(e) => setNewGroup((p) => ({ ...p, required: e.target.checked }))}
            />
            <span className="f0-90">Required (customer must pick)</span>
          </label>
          <div className="flex ggap0-50">
            <button type="submit" className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 pointer b f0-85" disabled={savingGroup} style={savingGroup ? { opacity: 0.5 } : undefined}>
              {savingGroup ? 'Saving…' : 'Save group'}
            </button>
            <button
              type="button"
              className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 pointer f0-85"
              onClick={() => setShowNewGroupForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 pointer flex items-center ggap0-50 f0-90"
          onClick={() => setShowNewGroupForm(true)}
        >
          <FaPlus /> Add option group
        </button>
      )}
    </div>
  );
}
