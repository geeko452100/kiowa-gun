"use client";

import { useMemo, useState } from "react";

type Member = { id: number; name: string; email: string };

function nameParts(name: string) {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts[parts.length - 1] ?? "" };
}

export default function RecipientPicker({
  members,
  selectedIds,
  onChange,
}: {
  members: Member[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"first" | "last">("first");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members;
    return [...list].sort((a, b) => {
      const ka = sortBy === "first" ? nameParts(a.name).first : nameParts(a.name).last;
      const kb = sortBy === "first" ? nameParts(b.name).first : nameParts(b.name).last;
      return ka.localeCompare(kb);
    });
  }, [members, search, sortBy]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));

  function toggleOne(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleAll() {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      filtered.forEach((m) => next.delete(m.id));
    } else {
      filtered.forEach((m) => next.add(m.id));
    }
    onChange(next);
  }

  const selectedMembers = members.filter((m) => selectedIds.has(m.id));

  return (
    <div className="recipient-picker">
      <div className="recipient-picker-heading">
        <strong>Recipients</strong>
        <span className="admin-note">
          {selectedIds.size} of {members.length} selected
        </span>
      </div>

      <div className="recipient-picker-controls">
        <label className="recipient-picker-select-all">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />
          Select all
        </label>
        <div className="recipient-picker-sort">
          <span className="admin-note">Sort by:</span>
          <button
            type="button"
            className={sortBy === "first" ? "active" : ""}
            onClick={() => setSortBy("first")}
          >
            First name
          </button>
          <button
            type="button"
            className={sortBy === "last" ? "active" : ""}
            onClick={() => setSortBy("last")}
          >
            Last name
          </button>
        </div>
      </div>

      <input
        type="search"
        className="recipient-picker-search"
        placeholder="Type a name to filter…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="recipient-picker-list">
        {filtered.map((m) => (
          <li key={m.id}>
            <label>
              <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} />
              {m.name} <span className="admin-note">({m.email})</span>
            </label>
          </li>
        ))}
        {filtered.length === 0 && <li className="admin-note">No members match &quot;{search}&quot;.</li>}
      </ul>

      <p className="recipient-picker-selected admin-note">
        {selectedMembers.length > 0
          ? `Selected: ${selectedMembers.map((m) => m.name).join(", ")}`
          : "No recipients selected."}
      </p>
    </div>
  );
}
