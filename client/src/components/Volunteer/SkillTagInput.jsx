import { useState } from 'react';

export default function SkillTagInput({
  label = 'Skills',
  value = [],
  onChange,
  placeholder = 'Type a skill and press Enter',
}) {
  const [draft, setDraft] = useState('');

  function commitSkill() {
    const normalizedSkill = draft.trim();

    if (!normalizedSkill || value.includes(normalizedSkill)) {
      setDraft('');
      return;
    }

    onChange([...value, normalizedSkill]);
    setDraft('');
  }

  function removeSkill(skillToRemove) {
    onChange(value.filter((skill) => skill !== skillToRemove));
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="tag-input">
        <div className="tag-list">
          {value.map((skill) => (
            <button key={skill} type="button" className="tag tag--interactive" onClick={() => removeSkill(skill)}>
              {skill}
              <span>×</span>
            </button>
          ))}
        </div>
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commitSkill();
            }
          }}
          onBlur={commitSkill}
        />
      </div>
    </div>
  );
}
