/**
 * Admin multi-select pickers — **locked** presets on top of `AutoSuggestMulti`.
 *
 * - **DirectoryParticipantPicker** — Team + Contacts groups for `/api/directory` rows (events, projects, …).
 * - **admin-picker-styles** — shared width/height tokens; reuse with `AutoSuggestMulti` for other pickers (e.g. resources while that module is WIP).
 *
 * For custom lists, import `AutoSuggestMulti` from `@/components/ui/auto-suggest-multi` and optionally
 * `ADMIN_PICKER_*` from `./admin-picker-styles`.
 */

export {
  ADMIN_PICKER_DROPDOWN_CLASS,
  ADMIN_PICKER_FIELD_CLASS,
} from "./admin-picker-styles";

export {
  DirectoryParticipantPicker,
  type DirectoryPickerRow,
  type DirectoryParticipantPickerProps,
  toDirectoryParticipantCompositeId,
  parseDirectoryParticipantCompositeId,
} from "./DirectoryParticipantPicker";
