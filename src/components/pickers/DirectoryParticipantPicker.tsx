"use client";

import { useMemo } from "react";
import { AutoSuggestMulti, type AutoSuggestGroup, type AutoSuggestOption } from "@/components/ui/auto-suggest-multi";
import {
  toDirectoryParticipantCompositeId,
  type DirectoryParticipantSourceType,
} from "@/lib/pickers/directory-participant-id";
import { ADMIN_PICKER_DROPDOWN_CLASS, ADMIN_PICKER_FIELD_CLASS } from "./admin-picker-styles";

/** Row shape aligned with GET /api/directory entries. */
export interface DirectoryPickerRow {
  source_type: string;
  source_id: string;
  display_label: string;
  subtitle: string;
}

export interface DirectoryParticipantPickerProps {
  directoryRows: DirectoryPickerRow[];
  /** Selected keys: `team_member:<uuid>` / `crm_contact:<uuid>`. */
  selectedCompositeIds: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
}

const TEAM_HEADING = "Team";
const CONTACTS_HEADING = "Contacts";
const EMPTY_TEAM = "- no team members found -";
const EMPTY_CONTACTS = "- no contacts found -";

const DEFAULT_PLACEHOLDER = "Type to search team or contacts…";

/**
 * Directory preset: **Team** and **Contacts** groups (headers, empty lines, contact section offset)
 * match `AutoSuggestMulti` grouped styling. Use for any admin surface that picks people from
 * `/api/directory`.
 */
export function DirectoryParticipantPicker({
  directoryRows,
  selectedCompositeIds,
  onSelectionChange,
  placeholder = DEFAULT_PLACEHOLDER,
  className,
  dropdownClassName,
}: DirectoryParticipantPickerProps) {
  const groups: AutoSuggestGroup[] = useMemo(() => {
    const toOpt = (e: DirectoryPickerRow): AutoSuggestOption | null => {
      if (e.source_type !== "team_member" && e.source_type !== "crm_contact") return null;
      const st = e.source_type as DirectoryParticipantSourceType;
      return {
        id: toDirectoryParticipantCompositeId(st, e.source_id),
        label: e.display_label,
        searchText: `${e.display_label} ${e.subtitle}`.trim(),
      };
    };
    const team: AutoSuggestOption[] = [];
    const contacts: AutoSuggestOption[] = [];
    for (const row of directoryRows) {
      const opt = toOpt(row);
      if (!opt) continue;
      if (row.source_type === "team_member") team.push(opt);
      else if (row.source_type === "crm_contact") contacts.push(opt);
    }
    return [
      { heading: TEAM_HEADING, options: team, emptyLabel: EMPTY_TEAM },
      { heading: CONTACTS_HEADING, options: contacts, emptyLabel: EMPTY_CONTACTS },
    ];
  }, [directoryRows]);

  return (
    <AutoSuggestMulti
      groups={groups}
      selectedIds={selectedCompositeIds}
      onSelectionChange={onSelectionChange}
      placeholder={placeholder}
      className={className ?? ADMIN_PICKER_FIELD_CLASS}
      dropdownClassName={dropdownClassName ?? ADMIN_PICKER_DROPDOWN_CLASS}
    />
  );
}

export {
  toDirectoryParticipantCompositeId,
  parseDirectoryParticipantCompositeId,
} from "@/lib/pickers/directory-participant-id";
