import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Field } from './Field';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ScheduleEditor({ schedule, onSave }) {
  const [rows, setRows] = useState(schedule && schedule.length ? schedule : []);
  const [draft, setDraft] = useState({ day: 'Mon', start: '09:00', end: '17:00' });
  const [saved, setSaved] = useState(false);

  function addRow() {
    setRows((current) => [...current, draft]);
    setSaved(false);
  }

  function removeRow(index) {
    setRows((current) => current.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function save() {
    await onSave(rows);
    setSaved(true);
  }

  return (
    <div className="schedule-editor">
      <div className="table scroll-area small-scroll">
        {rows.map((row, index) => (
          <div className="row schedule-row" key={index}>
            <span>{row.day}</span>
            <span>
              {row.start}&ndash;{row.end}
            </span>
            <span className="actions">
              <button title="Remove" onClick={() => removeRow(index)} type="button">
                <X size={15} />
              </button>
            </span>
          </div>
        ))}
        {!rows.length && <p className="empty">No availability windows added yet.</p>}
      </div>
      <div className="form-grid schedule-add">
        <Field label="Day">
          <select value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })}>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start">
          <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
        </Field>
        <Field label="End">
          <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </Field>
      </div>
      <div className="schedule-actions">
        <button type="button" onClick={addRow}>
          <Plus size={16} /> Add window
        </button>
        <button className="primary" type="button" onClick={save}>
          Save schedule
        </button>
        {saved && <span className="notice slim">Saved</span>}
      </div>
    </div>
  );
}
