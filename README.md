# 2. App State
character: an object of field key -> value, e.g. { name: 'Mira', level: '5', hp: '31' }.
Values are the strings the inputs hold; checkboxes hold true/false.

notes: [{ id, title, body, pinned }], newest first.

openNoteIds: ids of the note cards currently expanded on the Notes page. Not saved, so
cards start collapsed.

# 3. Navigation
showPage shows one page and hides the rest, highlights its nav button.

# 4. Home Page
Four groups, in order: the dice roller, the summary cards (character, HP, pinned notes),
the interactions on those cards, and the quick note form.

Dice roller. sfxRoll plays for most rolls, sfxNat1 and sfxNat20 replace it for a single
d20 that lands on 1 or 20. playSound rewinds a sound first so rapid rolls can retrigger
it, and ignores the error browsers raise when audio is blocked or the file is missing.

rollDice clamps the amount to 1-100 and writes the cleaned value back to the box, then
rolls. A d100 is rolled the percentile way (a tens die and a units die, 00 + 0 counts as
100) and always rolls once, whatever the amount box says. Every other die type rolls
the full amount and lists the individual results when there is more than one. The total 
goes on the big die. The last line logs the roll to the browser console for recording.

Summary cards. renderHome fills the character line and the HP boxes, then calls
renderPinnedNotes. Each pinned note has a scrollable text area, and its title and its
"Open in Notes" link carry data-open.

Interactions on the home cards.

HP boxes: the boxes here and the Hit points fields on the sheet are one value. Typing
here saves it and copies it into the sheet's field. The other direction happens when
renderHome runs on arrival.

Pinned note click: jumps to the Notes page with that card expanded.

Quick note: adds an unpinned note to the notes list. Pinning only happens on the Notes
page.

# 5. Character Sheet

The form is built by buildSheet instead of being written in index.html, because
abilities, saving throws and skills repeat the same markup. Any element with
data-k="key" is saved in `character` under that key as you type, and filled from it on
load.

ABILITIES and SKILLS are the rules data. A skill's position in SKILLS is its id
(sk_0 ... sk_17) and saved skill data points at that position, so new skills go at the
end of the list.

Form builders. textField is a labelled input saved under its key. adjustControl is the
Add / Set to dropdown plus one number box that every adjustable stat gets. derivedStat is
a calculated value with its adjustControl and a note line underneath.

Adjustments. For a stat with key K, three values are saved in `character`:
bn_K  the Add number
ov_K  the Set to number
md_K  which one is active, 'add' or 'set'
Switching modes never deletes the other number, it just stops using it.

Stat keys: str ... cha (ability scores), sv_str ... sv_cha (saving throws),
sk_0 ... sk_17 (skills), init, pb (proficiency bonus), pp (passive perception).

setValueOf returns null when the Set to box is empty. modeOf treats data saved before
modes existed (a Set to number and no mode) as 'set'. applyAdjustment gives the final
value: in 'set' mode the Set to number (or the calculated value if it is empty),
otherwise calculated + Add. unusedValueNote makes the "kept, not applied" text.
syncAdjustBox shows the active mode's number in the stat's box.

buildSheet writes the whole form, fills every field from `character` (selects take their
mode from modeOf), then recalculates. It runs at startup and again after the erase button.

recalculateSheet runs after every change and fills in everything that is not typed:
proficiency bonus   2 + floor((level - 1) / 4), level clamped to 1-20,
                         so +2 at levels 1-4 up to +6 at levels 17-20
ability modifier    floor((score - 10) / 2)
saving throw        ability modifier, plus proficiency if the box is ticked
skill               modifier of the skill's ability, plus proficiency if ticked
initiative          Dexterity modifier
passive perception  10 + the Perception skill bonus
Every result goes through applyAdjustment. The note lines under each stat say where
proficiency comes from ("Level 9 gives +4", or "would give" when Set to overrides it)
and mention saved numbers that are not in use.

One listener handles every input on the sheet. The number box (data-adj) writes to the
Set to or Add number depending on the mode. Any other field writes under its data-k.
Changing a mode dropdown also swaps the number shown in its box.

# 6. Notes Page
renderNotes redraws every card. Open cards show an editable title and text, closed cards
show a title and a two-line preview. Typing in a card saves but does not redraw, so the
cursor never jumps. Only opening, closing, pinning and deleting redraw.

Card buttons use data-act: t opens or closes, p pins or unpins, d deletes (after a
confirm). Card fields use data-f ('title' or 'body') and data-id.

addNote creates a card, opens it and focuses its text area.

A note is pinned only from this page. Pinned cards get an orange border and appear on
the home page.

# 7. Compendium
Data comes from dnd5eapi.co. CATEGORIES fills the dropdown, and each name must match an
API path under API_VERSION_PATH.

renderResults downloads the chosen category's list once, keeps it in categoryCache, and
filters it in the browser as you type. Clicking a result (data-u) fetches that one entry
into the detail panel.

renderApiValue prints an entry without knowing its shape: text and numbers as they are,
lists of text as paragraphs, lists of { name, desc } as "Name. description", references
like { name, url } as just the name, and any other object as "label: value" lines.
HIDDEN_API_FIELDS are internal and skipped. The top-level name is skipped too, because
it is already the heading.

# 8. Footer
The footer sits at the end of the document. Its only script is the erase button: it
removes both saved items, resets the in-memory state, rebuilds the sheet and notes, and
returns to the home page. See REVIEW item 2 in the file header about how the footer is
shown.

# 9. Startup
Builds the sheet, notes and compendium list, then opens the page named in the URL
(home if there is none).
